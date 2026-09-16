#pragma once
#include <windows.h>
#include <cfapi.h>

namespace skylyer {

// The callbacks CfConnectSyncRoot needs — see sync_root.cpp for how
// they're wired into the CF_CALLBACK_REGISTRATION table.
void CALLBACK OnFetchData(const CF_CALLBACK_INFO* info, const CF_CALLBACK_PARAMETERS* params);
void CALLBACK OnCancelFetchData(const CF_CALLBACK_INFO* info, const CF_CALLBACK_PARAMETERS* params);

// Pre-action notifications for an *existing* placeholder — always ack
// "allow" via CfExecute, nothing here needs to block a rename/delete.
void CALLBACK OnNotifyRename(const CF_CALLBACK_INFO* info, const CF_CALLBACK_PARAMETERS* params);
void CALLBACK OnNotifyDelete(const CF_CALLBACK_INFO* info, const CF_CALLBACK_PARAMETERS* params);

// Fired only after Explorer has actually committed the change — these call
// into JS (via NativeBridge) to update the server.
void CALLBACK OnNotifyRenameCompletion(const CF_CALLBACK_INFO* info, const CF_CALLBACK_PARAMETERS* params);
void CALLBACK OnNotifyDeleteCompletion(const CF_CALLBACK_INFO* info, const CF_CALLBACK_PARAMETERS* params);

}  // namespace skylyer
