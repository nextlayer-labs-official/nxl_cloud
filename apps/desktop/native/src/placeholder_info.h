#pragma once
#include <string>

#include "file_identity.h"

namespace skylyer {

// Reads a placeholder's stored FileIdentity straight off disk via
// CfGetPlaceholderInfo — the piece that lets reconciliation recover "which
// Skylyer id does this local file represent" without needing the disabled
// NOTIFY_RENAME/NOTIFY_DELETE callbacks or any JS-side bookkeeping that
// could go stale across an app restart. Returns `{valid: false}` (not a
// throw) for anything that isn't a placeholder or can't be opened — that's
// the expected, common case while walking a directory tree that also
// contains plain, not-yet-uploaded files.
ParsedFileIdentity TryReadPlaceholderIdentity(const std::wstring& path);

}  // namespace skylyer
