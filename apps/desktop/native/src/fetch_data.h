#pragma once
#include <windows.h>
#include <cfapi.h>

namespace skylyer {

// The callbacks CfConnectSyncRoot needs — see sync_root.cpp for how
// they're wired into the CF_CALLBACK_REGISTRATION table.
//
// NOTIFY_RENAME/NOTIFY_DELETE handlers deliberately don't exist here — see
// the comment in sync_root.cpp's ConnectSyncRoot for why (the ACK_RENAME
// response hung Explorer in testing). Rename/delete/edit propagation goes
// through reconcile.h's diff-and-converge pass instead, in both directions.
void CALLBACK OnFetchData(const CF_CALLBACK_INFO* info, const CF_CALLBACK_PARAMETERS* params);
void CALLBACK OnCancelFetchData(const CF_CALLBACK_INFO* info, const CF_CALLBACK_PARAMETERS* params);

}  // namespace skylyer
