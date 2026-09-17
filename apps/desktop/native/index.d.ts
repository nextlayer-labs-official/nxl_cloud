export interface PlaceholderItem {
  id: string;
  name: string;
  isFolder: boolean;
  sizeBytes: number;
  createdAtUnixMs: number;
  updatedAtUnixMs: number;
}

/** One placeholder found while walking the local sync-root tree, with its real Skylyer id recovered straight from disk via CfGetPlaceholderInfo. */
export interface LocalPlaceholderEntry {
  path: string;
  id: string;
  isFolder: boolean;
  sizeBytes: number;
  lastWriteTimeUnixMs: number;
}

export function registerSyncRoot(rootPath: string, syncRootId: string, displayName: string, iconPath: string): void;
export function unregisterSyncRoot(syncRootId: string): void;
/** Finds and unregisters every "Skylyer!" sync root the OS currently has registered, for any account — used by the uninstaller. Retries internally to work around GetCurrentSyncRoots() sometimes returning a stale/empty snapshot; blocks for a couple of seconds, never throws. */
export function unregisterAllSyncRoots(): void;
export function connectSyncRoot(rootPath: string): void;
export function disconnectSyncRoot(): void;
export function createPlaceholders(parentPath: string, items: PlaceholderItem[]): void;

/**
 * Registers the JS-side handler for a native<->JS bridge channel. `fn`
 * receives the channel's args as plain strings, followed by a numeric
 * token, and must eventually call `resolveBridgeCall`/`rejectBridgeCall`
 * with that same token once its async work settles. Channels in use:
 * - "getDownloadUrl": (fileId) => resolves with a presigned download URL.
 * - "newLocalItem": (type, absolutePath, name) => resolves with the new
 *   real File/Folder id once created/uploaded.
 * - "hydrationComplete": (fileId) => fired once a file finishes
 *   downloading, so its sync-state fingerprint can be updated immediately
 *   (avoids mistaking the hydration write for a local edit). Resolves "".
 * - "localTreeChanged": () => fired (debounced) after any local filesystem
 *   change settles, to run the local half of reconciliation. Resolves "".
 */
export function setBridgeProvider(channel: string, fn: (...args: [...string[], number]) => void): void;
export function resolveBridgeCall(token: number, result: string): void;
export function rejectBridgeCall(token: number, message: string): void;

export function startWatchingLocalChanges(rootPath: string): void;
export function stopWatchingLocalChanges(): void;

/** Ground truth for reconciliation's local half — see reconcile.h. */
export function readLocalPlaceholderTree(rootPath: string): LocalPlaceholderEntry[];
/** Applies a detected remote rename/move to the local placeholder. */
export function renameLocalPath(oldPath: string, newPath: string): void;
/** Applies a detected remote trash to the local placeholder. Idempotent if already gone. */
export function deleteLocalPath(path: string, isFolder: boolean): void;
/** Applies a detected remote content edit: frees local content and clears the in-sync flag so the next open re-fetches fresh bytes. */
export function dehydrateAndRefreshPlaceholder(path: string, sizeBytes: number, updatedAtUnixMs: number): void;
/** Re-affirms a placeholder's in-sync flag — call after handling a rename/move, which clears it; required before a later dehydrate call on the same path can succeed. */
export function markLocalPathInSync(path: string): void;
