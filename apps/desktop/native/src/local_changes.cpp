#include "local_changes.h"

#include <windows.h>
#include <cfapi.h>

#include <atomic>
#include <chrono>
#include <cstdio>
#include <mutex>
#include <stdexcept>
#include <thread>
#include <unordered_map>
#include <vector>

#include "fetch_bridge.h"
#include "file_identity.h"
#include "string_util.h"

namespace skylyer {

namespace {

constexpr auto kDebounceWindow = std::chrono::milliseconds(1500);
constexpr auto kDebounceSweepInterval = std::chrono::milliseconds(500);
constexpr DWORD kNotifyBufferSize = 64 * 1024;

std::wstring g_rootPath;
std::atomic<bool> g_running{false};
std::thread g_watcherThread;
std::thread g_debounceThread;
HANDLE g_dirHandle = INVALID_HANDLE_VALUE;

std::mutex g_pendingMutex;
std::unordered_map<std::wstring, std::chrono::steady_clock::time_point> g_pending;

void MarkPending(const std::wstring& path) {
  std::lock_guard<std::mutex> lock(g_pendingMutex);
  g_pending[path] = std::chrono::steady_clock::now();
}

std::wstring FileNameOf(const std::wstring& path) {
  size_t pos = path.find_last_of(L"\\/");
  return pos == std::wstring::npos ? path : path.substr(pos + 1);
}

std::wstring ParentOf(const std::wstring& path) {
  size_t pos = path.find_last_of(L"\\/");
  return pos == std::wstring::npos ? L"" : path.substr(0, pos);
}

bool HasReparsePoint(const std::wstring& path) {
  DWORD attrs = GetFileAttributesW(path.c_str());
  return attrs != INVALID_FILE_ATTRIBUTES && (attrs & FILE_ATTRIBUTE_REPARSE_POINT) != 0;
}

// Editors/Office commonly create hidden lock/temp files (~$file.xlsx,
// .tmp) alongside a real save — never worth uploading as their own item.
bool ShouldIgnore(const std::wstring& path, DWORD attrs) {
  std::wstring name = FileNameOf(path);
  if (name.rfind(L"~$", 0) == 0) return true;
  if (attrs & (FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_TEMPORARY)) return true;
  return false;
}

/** Returns false (and re-queues) if `path`'s parent isn't a placeholder yet — a new folder's own conversion may not have resolved before its children's debounce fires. */
bool ParentIsReady(const std::wstring& path) {
  std::wstring parent = ParentOf(path);
  if (parent.empty() || parent == g_rootPath) return true;
  return HasReparsePoint(parent);
}

void ProcessNewLocalItem(const std::wstring& path) {
  DWORD attrs = GetFileAttributesW(path.c_str());
  if (attrs == INVALID_FILE_ATTRIBUTES) return;              // Gone already (temp file cleaned up, etc).
  if (attrs & FILE_ATTRIBUTE_REPARSE_POINT) return;           // Already a placeholder — nothing to do.
  if (ShouldIgnore(path, attrs)) return;

  if (!ParentIsReady(path)) {
    MarkPending(path);  // Retry once the parent folder has resolved.
    return;
  }

  bool isFolder = (attrs & FILE_ATTRIBUTE_DIRECTORY) != 0;
  std::wstring name = FileNameOf(path);

  HANDLE handle = CreateFileW(path.c_str(), GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                               nullptr, OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS, nullptr);
  if (handle == INVALID_HANDLE_VALUE) return;

  USN usn = 0;
  HRESULT hr = CfConvertToPlaceholder(handle, nullptr, 0, CF_CONVERT_FLAG_NONE, &usn, nullptr);
  if (FAILED(hr)) {
    CloseHandle(handle);
    return;
  }

  try {
    std::string realId = NativeBridge::Call("newLocalItem", {isFolder ? "folder" : "file", ToUtf8(path), ToUtf8(name)});
    std::wstring identity = MakeFileIdentity(ToWide(realId), isFolder);

    CF_UPDATE_FLAGS updateFlags = CF_UPDATE_FLAG_MARK_IN_SYNC;
    if (isFolder) updateFlags |= CF_UPDATE_FLAG_DISABLE_ON_DEMAND_POPULATION;

    CfUpdatePlaceholder(handle, nullptr, identity.c_str(), static_cast<DWORD>((identity.size() + 1) * sizeof(wchar_t)),
                         nullptr, 0, updateFlags, &usn, nullptr);
  } catch (const std::exception& ex) {
    // Best-effort for this milestone (no retry/upload-failed UI yet) — left
    // converted-but-not-marked-in-sync, so the user sees it still pending
    // rather than losing the file. Still worth a log line for diagnosis.
    fwprintf(stderr, L"[Skylyer] newLocalItem upload failed for %s: %hs\n", path.c_str(), ex.what());
  } catch (...) {
  }

  CloseHandle(handle);
}

void DebounceLoop() {
  while (g_running.load()) {
    std::this_thread::sleep_for(kDebounceSweepInterval);

    std::vector<std::wstring> ready;
    {
      std::lock_guard<std::mutex> lock(g_pendingMutex);
      auto now = std::chrono::steady_clock::now();
      for (auto it = g_pending.begin(); it != g_pending.end();) {
        if (now - it->second >= kDebounceWindow) {
          ready.push_back(it->first);
          it = g_pending.erase(it);
        } else {
          ++it;
        }
      }
    }

    for (const auto& path : ready) {
      if (!g_running.load()) break;
      ProcessNewLocalItem(path);
    }
  }
}

void WatcherLoop() {
  std::vector<BYTE> buffer(kNotifyBufferSize);

  while (g_running.load()) {
    DWORD bytesReturned = 0;
    BOOL ok = ReadDirectoryChangesW(g_dirHandle, buffer.data(), static_cast<DWORD>(buffer.size()),
                                     /*bWatchSubtree=*/TRUE, FILE_NOTIFY_CHANGE_FILE_NAME | FILE_NOTIFY_CHANGE_DIR_NAME,
                                     &bytesReturned, nullptr, nullptr);
    if (!ok || bytesReturned == 0) {
      if (!g_running.load()) break;
      continue;  // Handle closed (shutdown) or a transient buffer overflow — just keep watching.
    }

    size_t offset = 0;
    for (;;) {
      auto* info = reinterpret_cast<FILE_NOTIFY_INFORMATION*>(buffer.data() + offset);
      std::wstring relativeName(info->FileName, info->FileNameLength / sizeof(wchar_t));

      if (info->Action == FILE_ACTION_ADDED || info->Action == FILE_ACTION_RENAMED_NEW_NAME) {
        MarkPending(g_rootPath + L"\\" + relativeName);
      }

      if (info->NextEntryOffset == 0) break;
      offset += info->NextEntryOffset;
    }
  }
}

}  // namespace

void StartWatchingLocalChanges(const std::wstring& rootPath) {
  if (g_running.load()) return;

  g_dirHandle = CreateFileW(rootPath.c_str(), FILE_LIST_DIRECTORY,
                             FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, nullptr, OPEN_EXISTING,
                             FILE_FLAG_BACKUP_SEMANTICS, nullptr);
  if (g_dirHandle == INVALID_HANDLE_VALUE) {
    throw std::runtime_error("StartWatchingLocalChanges: could not open the sync root directory");
  }

  g_rootPath = rootPath;
  g_running.store(true);
  g_watcherThread = std::thread(WatcherLoop);
  g_debounceThread = std::thread(DebounceLoop);
}

void StopWatchingLocalChanges() {
  if (!g_running.load()) return;
  g_running.store(false);

  if (g_dirHandle != INVALID_HANDLE_VALUE) {
    CloseHandle(g_dirHandle);  // Unblocks the pending ReadDirectoryChangesW call.
    g_dirHandle = INVALID_HANDLE_VALUE;
  }

  if (g_watcherThread.joinable()) g_watcherThread.join();
  if (g_debounceThread.joinable()) g_debounceThread.join();

  std::lock_guard<std::mutex> lock(g_pendingMutex);
  g_pending.clear();
}

}  // namespace skylyer
