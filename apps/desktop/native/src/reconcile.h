#pragma once
#include <cstdint>
#include <string>
#include <vector>

namespace skylyer {

struct LocalPlaceholderEntry {
  std::wstring path;  // Absolute path.
  std::wstring id;    // Skylyer File.id / Folder.id, recovered from the placeholder's FileIdentity.
  bool isFolder;
  uint64_t sizeBytes;          // 0 for folders.
  int64_t lastWriteTimeUnixMs;
};

// Ground truth for reconciliation's local half: recursively walks
// `rootPath`, reading each placeholder's real FileIdentity straight off
// disk (via placeholder_info.h) rather than trusting any JS-side cache —
// correct even after the app was closed while Explorer changed things.
// Plain, not-yet-uploaded files are simply absent from the result (they're
// the existing live-watcher upload path's concern, not reconciliation's).
std::vector<LocalPlaceholderEntry> ReadLocalPlaceholderTree(const std::wstring& rootPath);

// Renames/moves a local placeholder in response to a detected remote
// rename/move. Throws std::runtime_error on failure.
void RenameLocalPath(const std::wstring& oldPath, const std::wstring& newPath);

// Removes a local placeholder in response to a detected remote trash.
// Throws std::runtime_error on failure, except when the path is already
// gone (idempotent — matches CreatePlaceholders' own re-run tolerance).
void DeleteLocalPath(const std::wstring& path, bool isFolder);

// Applied when the 60s remote poll detects a file's content changed on the
// server: frees the placeholder's local content and clears its in-sync
// flag (CF_UPDATE_FLAG_DEHYDRATE | CF_UPDATE_FLAG_CLEAR_IN_SYNC) so the next
// open re-fetches fresh bytes via the normal OnFetchData path, rather than
// eagerly downloading while the file sits closed. Throws std::runtime_error
// on failure — including ERROR_CLOUD_FILE_NOT_IN_SYNC (hr=0x80070179) if
// the placeholder isn't currently marked in-sync (dehydrate requires it —
// confirmed empirically: a plain rename/move clears the flag, so callers
// that just handled a rename/move should call MarkLocalPathInSync first).
void DehydrateAndRefreshPlaceholder(const std::wstring& path, uint64_t sizeBytes, int64_t updatedAtUnixMs);

// Re-affirms a placeholder's in-sync flag after reconciliation has already
// handled whatever caused it to clear (observed after a plain rename/move —
// Explorer/the Cloud Filter driver seems to clear it defensively on any
// metadata-affecting operation the provider hasn't explicitly re-confirmed).
// Without this, a later DehydrateAndRefreshPlaceholder call on the same
// path fails with ERROR_CLOUD_FILE_NOT_IN_SYNC. Throws std::runtime_error
// on failure.
void MarkLocalPathInSync(const std::wstring& path);

}  // namespace skylyer
