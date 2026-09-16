#pragma once
#include <cstdint>
#include <string>
#include <vector>

namespace skylyer {

struct PlaceholderItem {
  std::wstring id;    // Skylyer File.id / Folder.id — becomes the placeholder's FileIdentity.
  std::wstring name;  // Just the file/folder name, not a path.
  bool isFolder;
  uint64_t sizeBytes;
  int64_t createdAtUnixMs;
  int64_t updatedAtUnixMs;
};

// Creates placeholders for `items` directly inside `parentPath` (an existing
// local directory — either the sync root itself or a folder placeholder
// already created inside it). Throws std::runtime_error on failure.
void CreatePlaceholders(const std::wstring& parentPath, const std::vector<PlaceholderItem>& items);

}  // namespace skylyer
