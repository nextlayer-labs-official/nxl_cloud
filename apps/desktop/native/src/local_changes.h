#pragma once
#include <string>

namespace skylyer {

// Watches `rootPath` (recursively) for genuinely new local files/folders —
// ones with no reparse point yet, i.e. never went through
// CreatePlaceholders/ConvertToPlaceholder. Debounces briefly per-path so a
// half-written file isn't uploaded mid-save, then brings each one under
// Cloud Filter management (CfConvertToPlaceholder) and calls the
// "newLocalItem" NativeBridge channel to actually create/upload it via the
// existing API, finally marking it in-sync (CfUpdatePlaceholder) once that
// resolves. Runs on its own background thread; call once, after
// ConnectSyncRoot. Safe to call multiple times (subsequent calls are a
// no-op) — there is only ever one watcher per process.
void StartWatchingLocalChanges(const std::wstring& rootPath);

// Stops the watcher thread. Safe to call even if never started.
void StopWatchingLocalChanges();

}  // namespace skylyer
