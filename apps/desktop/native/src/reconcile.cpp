#include "reconcile.h"

#include <windows.h>
#include <cfapi.h>

#include <sstream>
#include <stdexcept>

#include "placeholder_info.h"
#include "time_util.h"

namespace skylyer {

namespace {

std::wstring JoinPath(const std::wstring& dir, const std::wstring& name) {
  return dir + L"\\" + name;
}

std::runtime_error ToRuntimeError(const char* action, DWORD lastError) {
  std::stringstream ss;
  ss << action << " failed (lastError=" << lastError << ")";
  return std::runtime_error(ss.str());
}

void WalkDirectory(const std::wstring& dirPath, std::vector<LocalPlaceholderEntry>& out) {
  WIN32_FIND_DATAW findData;
  HANDLE findHandle = FindFirstFileW(JoinPath(dirPath, L"*").c_str(), &findData);
  if (findHandle == INVALID_HANDLE_VALUE) return;  // Gone/inaccessible — nothing to reconcile here.

  do {
    std::wstring name(findData.cFileName);
    if (name == L"." || name == L"..") continue;

    std::wstring fullPath = JoinPath(dirPath, name);
    bool isDir = (findData.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY) != 0;
    // CfGetPlaceholderStateFromFindData's declared parameter type is the
    // non-suffixed WIN32_FIND_DATA (the ANSI struct in a non-UNICODE build
    // like this one) — safe to reinterpret from our WIN32_FIND_DATAW since
    // the function only reads dwFileAttributes/dwReserved0, which sit at
    // identical offsets in both variants (only the trailing name arrays
    // differ in size/type).
    CF_PLACEHOLDER_STATE state =
        CfGetPlaceholderStateFromFindData(reinterpret_cast<const WIN32_FIND_DATA*>(&findData));

    if (state & CF_PLACEHOLDER_STATE_PLACEHOLDER) {
      ParsedFileIdentity identity = TryReadPlaceholderIdentity(fullPath);
      if (identity.valid) {
        uint64_t sizeBytes = isDir ? 0
                                    : (static_cast<uint64_t>(findData.nFileSizeHigh) << 32) | findData.nFileSizeLow;
        out.push_back({fullPath, identity.id, identity.isFolder, sizeBytes,
                        FileTimeToUnixMs(findData.ftLastWriteTime)});
      }
    }

    // Recurse into every directory, not just placeholder ones — a plain,
    // not-yet-uploaded folder can still contain placeholders underneath it
    // in edge cases (e.g. a folder created and populated in one offline
    // burst before this reconciliation pass ever ran).
    if (isDir) WalkDirectory(fullPath, out);
  } while (FindNextFileW(findHandle, &findData));

  FindClose(findHandle);
}

}  // namespace

std::vector<LocalPlaceholderEntry> ReadLocalPlaceholderTree(const std::wstring& rootPath) {
  std::vector<LocalPlaceholderEntry> result;
  WalkDirectory(rootPath, result);
  return result;
}

void RenameLocalPath(const std::wstring& oldPath, const std::wstring& newPath) {
  if (!MoveFileExW(oldPath.c_str(), newPath.c_str(), 0)) {
    throw ToRuntimeError("RenameLocalPath", GetLastError());
  }
}

void DeleteLocalPath(const std::wstring& path, bool isFolder) {
  BOOL ok = isFolder ? RemoveDirectoryW(path.c_str()) : DeleteFileW(path.c_str());
  if (!ok) {
    DWORD err = GetLastError();
    if (err == ERROR_FILE_NOT_FOUND || err == ERROR_PATH_NOT_FOUND) return;  // Already gone — fine.
    throw ToRuntimeError("DeleteLocalPath", err);
  }
}

void DehydrateAndRefreshPlaceholder(const std::wstring& path, uint64_t sizeBytes, int64_t updatedAtUnixMs) {
  HANDLE handle = CreateFileW(path.c_str(), GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                               nullptr, OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS, nullptr);
  if (handle == INVALID_HANDLE_VALUE) throw ToRuntimeError("DehydrateAndRefreshPlaceholder: open", GetLastError());

  // Read the placeholder's current metadata first so this only touches the
  // timestamps that actually changed — CfUpdatePlaceholder takes a whole
  // CF_FS_METADATA, and clobbering CreationTime/FileAttributes with zeros
  // would be a real (if subtle) regression, not just a cosmetic one.
  FILE_BASIC_INFO basicInfo{};
  if (!GetFileInformationByHandleEx(handle, FileBasicInfo, &basicInfo, sizeof(basicInfo))) {
    DWORD err = GetLastError();
    CloseHandle(handle);
    throw ToRuntimeError("DehydrateAndRefreshPlaceholder: read metadata", err);
  }

  LARGE_INTEGER newTime = UnixMsToFileTime(updatedAtUnixMs);
  basicInfo.LastWriteTime = newTime;
  basicInfo.ChangeTime = newTime;

  CF_FS_METADATA fsMetadata{};
  fsMetadata.BasicInfo = basicInfo;
  fsMetadata.FileSize.QuadPart = static_cast<LONGLONG>(sizeBytes);

  USN usn = 0;
  HRESULT hr = CfUpdatePlaceholder(handle, &fsMetadata, nullptr, 0, nullptr, 0,
                                    CF_UPDATE_FLAG_DEHYDRATE | CF_UPDATE_FLAG_CLEAR_IN_SYNC, &usn, nullptr);
  CloseHandle(handle);

  if (FAILED(hr)) {
    std::stringstream ss;
    ss << "DehydrateAndRefreshPlaceholder: CfUpdatePlaceholder failed (hr=0x" << std::hex << hr << ")";
    throw std::runtime_error(ss.str());
  }
}

void MarkLocalPathInSync(const std::wstring& path) {
  HANDLE handle = CreateFileW(path.c_str(), GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                               nullptr, OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS, nullptr);
  if (handle == INVALID_HANDLE_VALUE) throw ToRuntimeError("MarkLocalPathInSync: open", GetLastError());

  USN usn = 0;
  HRESULT hr = CfUpdatePlaceholder(handle, nullptr, nullptr, 0, nullptr, 0, CF_UPDATE_FLAG_MARK_IN_SYNC, &usn, nullptr);
  CloseHandle(handle);

  if (FAILED(hr)) {
    std::stringstream ss;
    ss << "MarkLocalPathInSync: CfUpdatePlaceholder failed (hr=0x" << std::hex << hr << ")";
    throw std::runtime_error(ss.str());
  }
}

}  // namespace skylyer
