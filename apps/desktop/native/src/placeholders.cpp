#include "placeholders.h"

#include <windows.h>
#include <cfapi.h>

#include <sstream>
#include <stdexcept>
#include <vector>

#include "file_identity.h"

namespace skylyer {

namespace {

// FILE_BASIC_INFO's timestamp fields (used by CF_FS_METADATA) are
// LARGE_INTEGER, not the classic two-DWORD FILETIME struct — both represent
// the same 100ns-tick-since-1601 value, just packed differently. Unix epoch
// (1970-01-01) is 116444736000000000 of those ticks after 1601-01-01.
LARGE_INTEGER UnixMsToFileTime(int64_t unixMs) {
  LARGE_INTEGER li;
  li.QuadPart = unixMs * 10000LL + 116444736000000000LL;
  return li;
}

}  // namespace

void CreatePlaceholders(const std::wstring& parentPath, const std::vector<PlaceholderItem>& items) {
  if (items.empty()) return;

  std::vector<CF_PLACEHOLDER_CREATE_INFO> entries(items.size());
  // Identity strings must outlive the CfCreatePlaceholders call below —
  // held here rather than as a temporary inside the loop.
  std::vector<std::wstring> identities(items.size());

  for (size_t i = 0; i < items.size(); i++) {
    const PlaceholderItem& item = items[i];
    CF_PLACEHOLDER_CREATE_INFO& entry = entries[i];
    ZeroMemory(&entry, sizeof(entry));

    identities[i] = MakeFileIdentity(item.id, item.isFolder);
    entry.FileIdentity = const_cast<wchar_t*>(identities[i].c_str());
    entry.FileIdentityLength = static_cast<DWORD>((identities[i].size() + 1) * sizeof(wchar_t));
    entry.RelativeFileName = item.name.c_str();

    entry.FsMetadata.BasicInfo.FileAttributes = item.isFolder ? FILE_ATTRIBUTE_DIRECTORY : FILE_ATTRIBUTE_NORMAL;
    entry.FsMetadata.BasicInfo.CreationTime = UnixMsToFileTime(item.createdAtUnixMs);
    entry.FsMetadata.BasicInfo.LastWriteTime = UnixMsToFileTime(item.updatedAtUnixMs);
    entry.FsMetadata.BasicInfo.LastAccessTime = UnixMsToFileTime(item.updatedAtUnixMs);
    entry.FsMetadata.BasicInfo.ChangeTime = UnixMsToFileTime(item.updatedAtUnixMs);
    entry.FsMetadata.FileSize.QuadPart = item.isFolder ? 0 : static_cast<LONGLONG>(item.sizeBytes);

    entry.Flags = CF_PLACEHOLDER_CREATE_FLAG_MARK_IN_SYNC;
    if (item.isFolder) {
      entry.Flags |= CF_PLACEHOLDER_CREATE_FLAG_DISABLE_ON_DEMAND_POPULATION;
    }
  }

  DWORD entriesProcessed = 0;
  HRESULT hr = CfCreatePlaceholders(
      parentPath.c_str(), entries.data(), static_cast<DWORD>(entries.size()), CF_CREATE_FLAG_NONE, &entriesProcessed);

  // A re-login for an account whose local folder already has these
  // placeholders (e.g. the app restarted without the folder ever being
  // deleted, or was reinstalled pointing at the same path) hits this —
  // there's nothing to do, the placeholder already exists with a name at
  // this path, not a real failure.
  if (hr == HRESULT_FROM_WIN32(ERROR_ALREADY_EXISTS)) return;

  if (FAILED(hr)) {
    std::stringstream ss;
    ss << "CfCreatePlaceholders failed (hr=0x" << std::hex << hr << ")";
    throw std::runtime_error(ss.str());
  }

  for (size_t i = 0; i < entries.size(); i++) {
    if (FAILED(entries[i].Result)) {
      std::stringstream ss;
      ss << "CfCreatePlaceholders: entry " << i << " (\"";
      // Narrow just for the error message; names are short, lossy conversion is fine here.
      for (wchar_t c : items[i].name) ss << static_cast<char>(c < 128 ? c : '?');
      ss << "\") failed (hr=0x" << std::hex << entries[i].Result << ")";
      throw std::runtime_error(ss.str());
    }
  }
}

}  // namespace skylyer
