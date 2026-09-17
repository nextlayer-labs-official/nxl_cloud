#pragma once
#include <string>

namespace skylyer {

// Registers a Cloud Filter sync root at `rootPath` (must be an existing,
// empty, local NTFS folder) so it shows up in Explorer's nav pane above
// "This PC". `iconPath` is a real on-disk .ico file (Explorer loads it by
// path, not from packed app resources) — pass an empty string to fall back
// to a generic system icon. Throws std::runtime_error with a readable
// message on failure.
void RegisterSyncRoot(const std::wstring& rootPath, const std::wstring& syncRootId, const std::wstring& displayName,
                       const std::wstring& iconPath);

// Reverses RegisterSyncRoot. Safe to call even if not currently registered.
void UnregisterSyncRoot(const std::wstring& syncRootId);

// Finds and unregisters every "Skylyer!" sync root the OS currently has
// registered, regardless of which account it belongs to — used by the
// uninstaller (see index.ts's --skylyer-uninstall-cleanup flag) so
// uninstalling actually removes the Explorer entry instead of leaving it
// orphaned. Retries the underlying enumeration a few times: confirmed
// empirically that GetCurrentSyncRoots() can return an empty list on one
// call and the real entries on the next, with no other state changing in
// between. Never throws — this is best-effort maintenance, not something
// that should ever crash the caller.
void UnregisterAllSyncRoots();

// Connects the FETCH_DATA/CANCEL_FETCH_DATA callback table to `rootPath` so
// opening a placeholder actually triggers a hydration fetch. Must be called
// after RegisterSyncRoot and after NativeBridge::SetProvider.
void ConnectSyncRoot(const std::wstring& rootPath);

// Reverses ConnectSyncRoot. Safe to call even if not currently connected.
void DisconnectSyncRoot();

}  // namespace skylyer
