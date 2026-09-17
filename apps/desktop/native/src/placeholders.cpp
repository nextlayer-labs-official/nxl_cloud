#include "placeholders.h"

#include <windows.h>
#include <cfapi.h>

#include <sstream>
#include <stdexcept>
#include <vector>

#include "file_identity.h"
#include "time_util.h"

namespace skylyer {

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
    // Same "already there, not a real failure" case as the whole-call check
    // above, but per-entry — reconciliation can end up calling this with a
    // batch that mixes genuinely-new items with ones that got created by a
    // near-simultaneous pass, so this isn't just a defensive no-op.
    if (entries[i].Result == HRESULT_FROM_WIN32(ERROR_ALREADY_EXISTS)) continue;
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
