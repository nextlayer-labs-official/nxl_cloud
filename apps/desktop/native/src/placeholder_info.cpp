#include "placeholder_info.h"

#include <windows.h>
#include <cfapi.h>

#include <vector>

namespace skylyer {

namespace {

// Cuid-based ids are short ("file:" + ~25 chars, well under this), so one
// try almost always succeeds — the retry-with-ReturnedLength path exists
// only as a correctness safety net, not because it's expected to fire.
constexpr DWORD kInitialBufferSize = sizeof(CF_PLACEHOLDER_BASIC_INFO) + 512;

ParsedFileIdentity ReadFromHandle(HANDLE handle) {
  std::vector<BYTE> buffer(kInitialBufferSize);
  DWORD returned = 0;
  HRESULT hr = CfGetPlaceholderInfo(handle, CF_PLACEHOLDER_INFO_BASIC, buffer.data(),
                                     static_cast<DWORD>(buffer.size()), &returned);

  if (hr == HRESULT_FROM_WIN32(ERROR_INSUFFICIENT_BUFFER) && returned > buffer.size()) {
    buffer.resize(returned);
    hr = CfGetPlaceholderInfo(handle, CF_PLACEHOLDER_INFO_BASIC, buffer.data(), static_cast<DWORD>(buffer.size()),
                               &returned);
  }
  if (FAILED(hr)) return {L"", false, false};

  auto* info = reinterpret_cast<CF_PLACEHOLDER_BASIC_INFO*>(buffer.data());
  if (info->FileIdentityLength == 0) return {L"", false, false};

  // FileIdentity is a variable-length trailing array, not a pointer — the
  // real bytes live right after the struct's fixed fields, within the same
  // buffer this call just filled in.
  std::wstring identity(reinterpret_cast<const wchar_t*>(info->FileIdentity),
                         info->FileIdentityLength / sizeof(wchar_t));
  // Stored with a trailing null terminator (see placeholders.cpp) — trim it
  // so ParseFileIdentity's prefix match isn't thrown off by an embedded NUL.
  size_t nul = identity.find(L'\0');
  if (nul != std::wstring::npos) identity.resize(nul);

  return ParseFileIdentity(identity);
}

}  // namespace

ParsedFileIdentity TryReadPlaceholderIdentity(const std::wstring& path) {
  HANDLE handle = CreateFileW(path.c_str(), FILE_READ_ATTRIBUTES,
                               FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, nullptr, OPEN_EXISTING,
                               FILE_FLAG_BACKUP_SEMANTICS, nullptr);
  if (handle == INVALID_HANDLE_VALUE) return {L"", false, false};

  ParsedFileIdentity result = ReadFromHandle(handle);
  CloseHandle(handle);
  return result;
}

}  // namespace skylyer
