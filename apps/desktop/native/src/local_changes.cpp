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

// Separate from g_pending (which only tracks brand-new items for the fast
// upload path) — this fires once, debounced, after ANY local change
// (rename/delete/edit included) settles, so JS can run a full local
// reconciliation pass. See sync-root.ts's "localTreeChanged" wiring.
std::mutex g_treeChangeMutex;
std::chrono::steady_clock::time_point g_lastTreeChangeAt;
bool g_treeChangeArmed = false;

void MarkTreeChanged() {
  std::lock_guard<std::mutex> lock(g_treeChangeMutex);
  g_lastTreeChangeAt = std::chrono::steady_clock::now();
  g_treeChangeArmed = true;
}

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
  // Without ENABLE_ON_DEMAND_POPULATION, a converted placeholder can never
  // be dehydrated later (confirmed empirically: DehydrateAndRefreshPlaceholder
  // failed with ERROR_CLOUD_FILE_NOT_IN_SYNC on one of these) — files that
  // arrived via the remote-pull path (placeholders.cpp's CfCreatePlaceholders)
  // get this implicitly, so local uploads need it explicitly to support a
  // later remote content-edit being applied to them the same way.
  HRESULT hr = CfConvertToPlaceholder(handle, nullptr, 0, CF_CONVERT_FLAG_ENABLE_ON_DEMAND_POPULATION, &usn, nullptr);
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

    // CfUpdatePlaceholder can itself touch the file's on-disk last-write
    // time — if JS recorded its "last synced" fingerprint from the stat()
    // it took inside the newLocalItem bridge call (before this line ran),
    // the very next reconciliation pass would see a mismatch and mistake
    // this conversion's own side effect for a real content edit, re-
    // uploading a file nobody touched. Reusing "hydrationComplete" here —
    // its JS handler already does exactly what's needed: re-stat and
    // correct the fingerprint now that conversion is truly finished.
    if (!isFolder) {
      try {
        NativeBridge::Call("hydrationComplete", {realId});
      } catch (...) {
      }
    }
  } catch (const std::exception& ex) {
    // Best-effort for this milestone (no retry/upload-failed UI yet) — left
    // converted-but-not-marked-in-sync, so the user sees it still pending
    // rather than losing the file. Still worth a log line for diagnosis.
    fwprintf(stderr, L"[Skylyer] newLocalItem upload failed for %s: %hs\n", path.c_str(), ex.what());
  } catch (...) {
  }

  CloseHandle(handle);
}

/**
 * One-shot startup catch-up: recursively walks `dirPath` top-down and runs
 * ProcessNewLocalItem on every plain (non-placeholder) entry it finds —
 * the same upload+convert-to-placeholder logic the live watcher's debounce
 * path already uses, just reused here for content that was created while
 * the app (and its watcher) wasn't running at all, so no ReadDirectoryChangesW
 * event was ever generated for it. Processing top-down means a folder is
 * already converted (so GetFileAttributesW sees FILE_ATTRIBUTE_REPARSE_POINT)
 * by the time this recurses into it, satisfying ParentIsReady immediately —
 * no retry/re-queue needed for this controlled walk.
 */
void ScanForNewLocalItems(const std::wstring& dirPath) {
  WIN32_FIND_DATAW findData;
  HANDLE findHandle = FindFirstFileW((dirPath + L"\\*").c_str(), &findData);
  if (findHandle == INVALID_HANDLE_VALUE) return;

  std::vector<std::wstring> subdirs;
  do {
    std::wstring name(findData.cFileName);
    if (name == L"." || name == L"..") continue;

    std::wstring fullPath = dirPath + L"\\" + name;
    bool isDir = (findData.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) != 0;
    bool isReparsePoint = (findData.dwFileAttributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0;

    if (!isReparsePoint) ProcessNewLocalItem(fullPath);
    // Recurse regardless of whether this entry needed converting — a
    // pre-existing placeholder folder can still contain pre-existing plain
    // files underneath it (e.g. dropped in during a previous offline run).
    if (isDir) subdirs.push_back(fullPath);
  } while (FindNextFileW(findHandle, &findData));
  FindClose(findHandle);

  if (!g_running.load()) return;  // App is shutting down — stop descending.
  for (const auto& subdir : subdirs) ScanForNewLocalItems(subdir);
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

    bool fireTreeChanged = false;
    {
      std::lock_guard<std::mutex> lock(g_treeChangeMutex);
      if (g_treeChangeArmed && std::chrono::steady_clock::now() - g_lastTreeChangeAt >= kDebounceWindow) {
        g_treeChangeArmed = false;
        fireTreeChanged = true;
      }
    }
    if (fireTreeChanged) {
      try {
        NativeBridge::Call("localTreeChanged", {});
      } catch (...) {
        // Best-effort — the 60s remote poll and the next local change will
        // still eventually catch whatever this run would have.
      }
    }
  }
}

void WatcherLoop() {
  std::vector<BYTE> buffer(kNotifyBufferSize);

  while (g_running.load()) {
    DWORD bytesReturned = 0;
    BOOL ok = ReadDirectoryChangesW(
        g_dirHandle, buffer.data(), static_cast<DWORD>(buffer.size()),
        /*bWatchSubtree=*/TRUE,
        FILE_NOTIFY_CHANGE_FILE_NAME | FILE_NOTIFY_CHANGE_DIR_NAME | FILE_NOTIFY_CHANGE_LAST_WRITE |
            FILE_NOTIFY_CHANGE_SIZE,
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
      // Every action (including the ones the fast path above doesn't
      // handle — removed, renamed-from, modified) also arms the broader
      // reconciliation trigger; see MarkTreeChanged's comment.
      MarkTreeChanged();

      if (info->NextEntryOffset == 0) break;
      offset += info->NextEntryOffset;
    }
  }

  // The thread that opened a handle is the one that should close it —
  // closing it from a DIFFERENT thread (as StopWatchingLocalChanges used
  // to) can itself block until this thread's pending synchronous
  // ReadDirectoryChangesW call actually completes, which is exactly what
  // caused a real deadlock ("Not Responding") when this ran on the JS main
  // thread during sign-out. CancelIoEx (called from StopWatchingLocalChanges)
  // is what actually unblocks the read above; this just cleans up after.
  if (g_dirHandle != INVALID_HANDLE_VALUE) {
    CloseHandle(g_dirHandle);
    g_dirHandle = INVALID_HANDLE_VALUE;
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

  // Catch up on anything created while the app wasn't running at all —
  // ReadDirectoryChangesW (started just below) only reports events from
  // this point forward, so it can never see a backlog. One-shot, detached:
  // it runs to completion (or the app quits) on its own, independent of
  // the ongoing watcher/debounce threads.
  std::thread(ScanForNewLocalItems, rootPath).detach();

  g_watcherThread = std::thread(WatcherLoop);
  g_debounceThread = std::thread(DebounceLoop);
}

void StopWatchingLocalChanges() {
  if (!g_running.load()) return;
  g_running.store(false);

  if (g_dirHandle != INVALID_HANDLE_VALUE) {
    // CancelIoEx (not CloseHandle) is what actually unblocks the watcher
    // thread's pending synchronous ReadDirectoryChangesW call here —
    // confirmed via a real repro: CloseHandle on a handle with pending I/O
    // issued by a DIFFERENT thread can itself block until that I/O
    // completes, which deadlocked the whole app ("Not Responding") since
    // this runs on the JS main thread (e.g. sign-out). CancelIoEx is
    // designed for exactly this cross-thread cancellation. The handle
    // itself is now closed by WatcherLoop, the thread that owns it.
    CancelIoEx(g_dirHandle, nullptr);
  }

  // Detach, don't join: g_debounceThread can be mid-ProcessNewLocalItem or
  // mid-"localTreeChanged", both of which block on NativeBridge::Call
  // waiting for this SAME main thread's event loop to run the JS handler —
  // joining here would deadlock for the same reason. g_running is already
  // false, so each thread exits on its own the moment its current
  // iteration/call finishes, with nothing left to join.
  if (g_watcherThread.joinable()) g_watcherThread.detach();
  if (g_debounceThread.joinable()) g_debounceThread.detach();

  {
    std::lock_guard<std::mutex> lock(g_pendingMutex);
    g_pending.clear();
  }
  {
    std::lock_guard<std::mutex> lock(g_treeChangeMutex);
    g_treeChangeArmed = false;
  }
}

}  // namespace skylyer
