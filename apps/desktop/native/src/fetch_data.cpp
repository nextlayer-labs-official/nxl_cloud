#include "fetch_data.h"

#include <windows.h>
#include <winhttp.h>

#include <atomic>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <vector>

#include "fetch_bridge.h"
#include "file_identity.h"
#include "string_util.h"

#pragma comment(lib, "winhttp.lib")

namespace skylyer {

namespace {

constexpr NTSTATUS kStatusSuccess = 0x00000000L;
constexpr NTSTATUS kStatusUnsuccessful = static_cast<NTSTATUS>(0xC0000001L);
constexpr DWORD kChunkSize = 64 * 1024;

std::mutex g_cancelMutex;
std::unordered_map<std::wstring, std::shared_ptr<std::atomic<bool>>> g_cancelFlags;

ParsedFileIdentity ParseCallbackIdentity(const CF_CALLBACK_INFO* info) {
  if (!info->FileIdentity || info->FileIdentityLength == 0) return {L"", false, false};
  // Stored as a null-terminated wide string ("file:<id>"/"folder:<id>")
  // when the placeholder was created — see placeholders.cpp.
  return ParseFileIdentity(std::wstring(static_cast<const wchar_t*>(info->FileIdentity)));
}

std::shared_ptr<std::atomic<bool>> RegisterCancelFlag(const std::wstring& fileId) {
  auto flag = std::make_shared<std::atomic<bool>>(false);
  std::lock_guard<std::mutex> lock(g_cancelMutex);
  g_cancelFlags[fileId] = flag;
  return flag;
}

void UnregisterCancelFlag(const std::wstring& fileId) {
  std::lock_guard<std::mutex> lock(g_cancelMutex);
  g_cancelFlags.erase(fileId);
}

// RAII wrapper so every exit path (including exceptions) closes WinHTTP handles.
struct WinHttpHandle {
  HINTERNET h = nullptr;
  ~WinHttpHandle() {
    if (h) WinHttpCloseHandle(h);
  }
};

void ReportFailure(const CF_CALLBACK_INFO* info, LONGLONG offset, LONGLONG length) {
  CF_OPERATION_INFO opInfo{};
  opInfo.StructSize = sizeof(opInfo);
  opInfo.Type = CF_OPERATION_TYPE_TRANSFER_DATA;
  opInfo.ConnectionKey = info->ConnectionKey;
  opInfo.TransferKey = info->TransferKey;

  CF_OPERATION_PARAMETERS opParams{};
  opParams.ParamSize = sizeof(opParams);
  opParams.TransferData.Flags = CF_OPERATION_TRANSFER_DATA_FLAG_NONE;
  opParams.TransferData.CompletionStatus = kStatusUnsuccessful;
  opParams.TransferData.Buffer = nullptr;
  opParams.TransferData.Offset.QuadPart = offset;
  opParams.TransferData.Length.QuadPart = length;

  CfExecute(&opInfo, &opParams);
}

}  // namespace

void CALLBACK OnFetchData(const CF_CALLBACK_INFO* info, const CF_CALLBACK_PARAMETERS* params) {
  ParsedFileIdentity identity = ParseCallbackIdentity(info);
  LONGLONG requiredOffset = params->FetchData.RequiredFileOffset.QuadPart;
  LONGLONG requiredLength = params->FetchData.RequiredLength.QuadPart;

  // Folders always have CF_PLACEHOLDER_CREATE_FLAG_DISABLE_ON_DEMAND_POPULATION
  // (see placeholders.cpp), so this should never actually fire for one —
  // treated as a hard failure rather than silently misrouting a fetch.
  if (!identity.valid || identity.isFolder) {
    ReportFailure(info, requiredOffset, requiredLength);
    return;
  }
  std::wstring fileId = identity.id;

  auto cancelFlag = RegisterCancelFlag(fileId);

  std::wstring downloadUrl;
  try {
    downloadUrl = ToWide(NativeBridge::Call("getDownloadUrl", {ToUtf8(fileId)}));
  } catch (...) {
    UnregisterCancelFlag(fileId);
    ReportFailure(info, requiredOffset, requiredLength);
    return;
  }

  URL_COMPONENTS urlComponents{};
  wchar_t hostName[256]{};
  wchar_t urlPath[2048]{};
  wchar_t extraInfo[4096]{};
  urlComponents.dwStructSize = sizeof(urlComponents);
  urlComponents.lpszHostName = hostName;
  urlComponents.dwHostNameLength = ARRAYSIZE(hostName);
  urlComponents.lpszUrlPath = urlPath;
  urlComponents.dwUrlPathLength = ARRAYSIZE(urlPath);
  urlComponents.lpszExtraInfo = extraInfo;
  urlComponents.dwExtraInfoLength = ARRAYSIZE(extraInfo);

  if (!WinHttpCrackUrl(downloadUrl.c_str(), 0, 0, &urlComponents)) {
    UnregisterCancelFlag(fileId);
    ReportFailure(info, requiredOffset, requiredLength);
    return;
  }

  std::wstring fullPath = std::wstring(urlPath) + extraInfo;
  bool secure = urlComponents.nScheme == INTERNET_SCHEME_HTTPS;

  WinHttpHandle session{WinHttpOpen(L"Skylyer/1.0", WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY, WINHTTP_NO_PROXY_NAME,
                                     WINHTTP_NO_PROXY_BYPASS, 0)};
  WinHttpHandle connect;
  WinHttpHandle request;
  bool ok = session.h != nullptr;

  if (ok) {
    connect.h = WinHttpConnect(session.h, hostName, urlComponents.nPort, 0);
    ok = connect.h != nullptr;
  }
  if (ok) {
    request.h = WinHttpOpenRequest(connect.h, L"GET", fullPath.c_str(), nullptr, WINHTTP_NO_REFERER,
                                    WINHTTP_DEFAULT_ACCEPT_TYPES, secure ? WINHTTP_FLAG_SECURE : 0);
    ok = request.h != nullptr;
  }
  if (ok) ok = WinHttpSendRequest(request.h, WINHTTP_NO_ADDITIONAL_HEADERS, 0, WINHTTP_NO_REQUEST_DATA, 0, 0, 0);
  if (ok) ok = WinHttpReceiveResponse(request.h, nullptr);

  if (!ok) {
    UnregisterCancelFlag(fileId);
    ReportFailure(info, requiredOffset, requiredLength);
    return;
  }

  std::vector<uint8_t> buffer(kChunkSize);
  LONGLONG offset = requiredOffset;
  bool failed = false;

  for (;;) {
    if (cancelFlag->load()) {
      failed = true;
      break;
    }

    DWORD available = 0;
    if (!WinHttpQueryDataAvailable(request.h, &available) || available == 0) break;

    DWORD toRead = std::min<DWORD>(available, kChunkSize);
    DWORD bytesRead = 0;
    if (!WinHttpReadData(request.h, buffer.data(), toRead, &bytesRead) || bytesRead == 0) break;

    CF_OPERATION_INFO opInfo{};
    opInfo.StructSize = sizeof(opInfo);
    opInfo.Type = CF_OPERATION_TYPE_TRANSFER_DATA;
    opInfo.ConnectionKey = info->ConnectionKey;
    opInfo.TransferKey = info->TransferKey;

    CF_OPERATION_PARAMETERS opParams{};
    opParams.ParamSize = sizeof(opParams);
    opParams.TransferData.Flags = CF_OPERATION_TRANSFER_DATA_FLAG_NONE;
    opParams.TransferData.CompletionStatus = kStatusSuccess;
    opParams.TransferData.Buffer = buffer.data();
    opParams.TransferData.Offset.QuadPart = offset;
    opParams.TransferData.Length.QuadPart = bytesRead;

    if (FAILED(CfExecute(&opInfo, &opParams))) {
      failed = true;
      break;
    }

    offset += bytesRead;
  }

  UnregisterCancelFlag(fileId);

  if (failed || offset < requiredOffset + requiredLength) {
    ReportFailure(info, offset, requiredOffset + requiredLength - offset);
  }
}

void CALLBACK OnCancelFetchData(const CF_CALLBACK_INFO* info, const CF_CALLBACK_PARAMETERS* /*params*/) {
  ParsedFileIdentity identity = ParseCallbackIdentity(info);
  if (!identity.valid) return;
  std::lock_guard<std::mutex> lock(g_cancelMutex);
  auto it = g_cancelFlags.find(identity.id);
  if (it != g_cancelFlags.end()) it->second->store(true);
}

namespace {

void AckRename(const CF_CALLBACK_INFO* info) {
  CF_OPERATION_INFO opInfo{};
  opInfo.StructSize = sizeof(opInfo);
  opInfo.Type = CF_OPERATION_TYPE_ACK_RENAME;
  opInfo.ConnectionKey = info->ConnectionKey;
  opInfo.RequestKey = info->RequestKey;

  CF_OPERATION_PARAMETERS opParams{};
  opParams.ParamSize = sizeof(opParams);
  opParams.AckRename.Flags = CF_OPERATION_ACK_RENAME_FLAG_NONE;
  opParams.AckRename.CompletionStatus = kStatusSuccess;  // Always allow — nothing here gates a rename.

  CfExecute(&opInfo, &opParams);
}

void AckDelete(const CF_CALLBACK_INFO* info) {
  CF_OPERATION_INFO opInfo{};
  opInfo.StructSize = sizeof(opInfo);
  opInfo.Type = CF_OPERATION_TYPE_ACK_DELETE;
  opInfo.ConnectionKey = info->ConnectionKey;
  opInfo.RequestKey = info->RequestKey;

  CF_OPERATION_PARAMETERS opParams{};
  opParams.ParamSize = sizeof(opParams);
  opParams.AckDelete.Flags = CF_OPERATION_ACK_DELETE_FLAG_NONE;
  opParams.AckDelete.CompletionStatus = kStatusSuccess;  // Always allow.

  CfExecute(&opInfo, &opParams);
}

}  // namespace

void CALLBACK OnNotifyRename(const CF_CALLBACK_INFO* info, const CF_CALLBACK_PARAMETERS* /*params*/) {
  AckRename(info);
}

void CALLBACK OnNotifyDelete(const CF_CALLBACK_INFO* info, const CF_CALLBACK_PARAMETERS* /*params*/) {
  AckDelete(info);
}

void CALLBACK OnNotifyRenameCompletion(const CF_CALLBACK_INFO* info, const CF_CALLBACK_PARAMETERS* params) {
  ParsedFileIdentity identity = ParseCallbackIdentity(info);
  if (!identity.valid) return;

  std::wstring oldPath = params->RenameCompletion.SourcePath ? params->RenameCompletion.SourcePath : L"";
  std::wstring newPath = info->NormalizedPath ? info->NormalizedPath : L"";
  if (newPath.empty()) return;

  try {
    NativeBridge::Call("renameOrMove", {identity.isFolder ? "folder" : "file", ToUtf8(identity.id), ToUtf8(oldPath),
                                         ToUtf8(newPath)});
  } catch (...) {
    // Best-effort — Explorer already committed the rename either way, and
    // there's no user-facing ack left to send at this point.
  }
}

void CALLBACK OnNotifyDeleteCompletion(const CF_CALLBACK_INFO* info, const CF_CALLBACK_PARAMETERS* /*params*/) {
  ParsedFileIdentity identity = ParseCallbackIdentity(info);
  if (!identity.valid) return;

  try {
    NativeBridge::Call("trash", {identity.isFolder ? "folder" : "file", ToUtf8(identity.id)});
  } catch (...) {
  }
}

}  // namespace skylyer
