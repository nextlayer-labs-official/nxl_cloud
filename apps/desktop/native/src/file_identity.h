#pragma once
#include <string>

namespace skylyer {

// A placeholder's FileIdentity is an opaque provider-defined blob. This
// project stores "file:<id>" / "folder:<id>" — a Skylyer File/Folder id
// with a type tag — so native code can route rename/delete/download calls
// to the right endpoint without keeping a separate id->type lookup table.
struct ParsedFileIdentity {
  std::wstring id;
  bool isFolder;
  bool valid;
};

inline std::wstring MakeFileIdentity(const std::wstring& id, bool isFolder) {
  return (isFolder ? L"folder:" : L"file:") + id;
}

inline ParsedFileIdentity ParseFileIdentity(const std::wstring& identity) {
  const std::wstring filePrefix = L"file:";
  const std::wstring folderPrefix = L"folder:";
  if (identity.rfind(filePrefix, 0) == 0) {
    return {identity.substr(filePrefix.size()), false, true};
  }
  if (identity.rfind(folderPrefix, 0) == 0) {
    return {identity.substr(folderPrefix.size()), true, true};
  }
  return {L"", false, false};
}

}  // namespace skylyer
