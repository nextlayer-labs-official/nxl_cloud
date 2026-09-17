#include "sync_root.h"

#include <windows.h>
#include <cfapi.h>

#include <mutex>
#include <sstream>
#include <stdexcept>

#include <winrt/Windows.Foundation.Collections.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Storage.h>
#include <winrt/Windows.Storage.Provider.h>

#include "fetch_data.h"

namespace skylyer {

using namespace winrt;
using namespace winrt::Windows::Storage;
using namespace winrt::Windows::Storage::Provider;

namespace {

// COM/WinRT needs the calling thread's apartment initialized. Electron's
// main process already calls CoInitializeEx itself (for its own native
// GUI/shell integration) before any of this code runs, almost always as
// STA — so requesting MTA here throws RPC_E_CHANGED_MODE (0x80010106),
// *not* a bug, just "COM is already initialized on this thread with a
// different concurrency model." That's fine for our purposes (simple
// synchronous WinRT calls work fine on an STA thread too), so it's the one
// hresult_error worth swallowing here — anything else is a real failure.
// This must not throw past this function uncaught: an uncaught C++
// exception crossing the N-API boundary crashes the whole process outright
// via std::terminate() instead of surfacing as a catchable JS error, which
// is exactly what happened before this fix was in place.
constexpr HRESULT kRpcEChangedMode = static_cast<HRESULT>(0x80010106L);

void EnsureApartmentInitialized() {
  static std::once_flag initialized;
  std::call_once(initialized, [] {
    try {
      init_apartment();
    } catch (const hresult_error& ex) {
      if (ex.code() != kRpcEChangedMode) throw;
    }
  });
}

std::runtime_error ToRuntimeError(const char* action, const hresult_error& ex) {
  std::wstringstream ws;
  ws << action << L" failed (hr=0x" << std::hex << static_cast<uint32_t>(ex.code()) << L"): " << ex.message().c_str();
  std::wstring wmsg = ws.str();
  return std::runtime_error(std::string(wmsg.begin(), wmsg.end()));
}

}  // namespace

void RegisterSyncRoot(const std::wstring& rootPath, const std::wstring& syncRootId, const std::wstring& displayName,
                       const std::wstring& iconPath) {
  EnsureApartmentInitialized();

  try {
    // Windows only allows one sync-root registration per local folder path
    // at a time. A past registration for this same path that was never
    // unregistered (a different account's id from an earlier login, or a
    // leftover from a previous install/uninstall cycle) makes the Register
    // call below fail with ERROR_ACCESS_DENIED (0x80070005) — confirmed via
    // a real repro — and that failure was previously silent to the user
    // (login proceeds normally; only the Explorer entry silently never
    // appears). Proactively clearing out any of our OWN prior registrations
    // first avoids this and self-heals cruft accumulated across sessions.
    auto currentRoots = StorageProviderSyncRootManager::GetCurrentSyncRoots();
    for (const auto& existing : currentRoots) {
      std::wstring existingId(existing.Id().c_str());
      if (existingId.rfind(L"Skylyer!", 0) == 0) {
        try {
          StorageProviderSyncRootManager::Unregister(existingId);
        } catch (const hresult_error&) {
          // Best-effort — if this particular stale entry can't be cleared,
          // the Register() call below will surface a clear failure anyway.
        }
      }
    }

    StorageFolder folder = StorageFolder::GetFolderFromPathAsync(rootPath).get();

    StorageProviderSyncRootInfo info;
    info.Id(syncRootId);
    info.Path(folder);
    info.DisplayNameResource(displayName);
    // Explorer wants "<path>,<resource index>" — index 0 is the ICO's own
    // first (and only, for one we generate) image.
    info.IconResource(iconPath.empty() ? L"%SystemRoot%\\system32\\imageres.dll,-1043" : iconPath + L",0");
    info.Version(L"1.0.0");
    info.PopulationPolicy(StorageProviderPopulationPolicy::AlwaysFull);
    info.InSyncPolicy(StorageProviderInSyncPolicy::FileCreationTime | StorageProviderInSyncPolicy::DirectoryCreationTime);
    info.HydrationPolicy(StorageProviderHydrationPolicy::Full);
    info.HydrationPolicyModifier(StorageProviderHydrationPolicyModifier::None);

    StorageProviderSyncRootManager::Register(info);
  } catch (const hresult_error& ex) {
    throw ToRuntimeError("RegisterSyncRoot", ex);
  }
}

void UnregisterSyncRoot(const std::wstring& syncRootId) {
  EnsureApartmentInitialized();

  try {
    StorageProviderSyncRootManager::Unregister(syncRootId);
  } catch (const hresult_error& ex) {
    // Not-found is a no-op from the caller's perspective (already unregistered).
    if (ex.code() == HRESULT_FROM_WIN32(ERROR_NOT_FOUND)) return;
    throw ToRuntimeError("UnregisterSyncRoot", ex);
  }
}

namespace {
CF_CONNECTION_KEY g_connectionKey{};
bool g_connected = false;
}  // namespace

void ConnectSyncRoot(const std::wstring& rootPath) {
  if (g_connected) return;

  // NOTIFY_RENAME/NOTIFY_DELETE deliberately never registered: live testing
  // found the ACK_RENAME response doesn't unblock Explorer — renaming a
  // synced placeholder hung the rename outright rather than just failing
  // (killing the app process was the only way to unstick it). Rename/
  // delete/edit propagation, both directions, goes through reconcile.h's
  // diff-and-converge pass instead — see sync-root.ts's reconciliation
  // wiring — which never touches CF_OPERATION_TYPE_ACK_RENAME/ACK_DELETE.
  static const CF_CALLBACK_REGISTRATION callbackTable[] = {
      {CF_CALLBACK_TYPE_FETCH_DATA, OnFetchData},
      {CF_CALLBACK_TYPE_CANCEL_FETCH_DATA, OnCancelFetchData},
      CF_CALLBACK_REGISTRATION_END,
  };

  HRESULT hr = CfConnectSyncRoot(rootPath.c_str(), callbackTable, nullptr,
                                  CF_CONNECT_FLAG_REQUIRE_PROCESS_INFO | CF_CONNECT_FLAG_REQUIRE_FULL_FILE_PATH,
                                  &g_connectionKey);
  if (FAILED(hr)) {
    std::stringstream ss;
    ss << "CfConnectSyncRoot failed (hr=0x" << std::hex << hr << ")";
    throw std::runtime_error(ss.str());
  }
  g_connected = true;
}

void DisconnectSyncRoot() {
  if (!g_connected) return;
  CfDisconnectSyncRoot(g_connectionKey);
  g_connected = false;
}

}  // namespace skylyer
