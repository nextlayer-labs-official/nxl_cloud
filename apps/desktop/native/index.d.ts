export interface PlaceholderItem {
  id: string;
  name: string;
  isFolder: boolean;
  sizeBytes: number;
  createdAtUnixMs: number;
  updatedAtUnixMs: number;
}

export function registerSyncRoot(rootPath: string, syncRootId: string, displayName: string, iconPath: string): void;
export function unregisterSyncRoot(syncRootId: string): void;
export function connectSyncRoot(rootPath: string): void;
export function disconnectSyncRoot(): void;
export function createPlaceholders(parentPath: string, items: PlaceholderItem[]): void;

/**
 * Registers the JS-side handler for a native<->JS bridge channel. `fn`
 * receives the channel's args as plain strings, followed by a numeric
 * token, and must eventually call `resolveBridgeCall`/`rejectBridgeCall`
 * with that same token once its async work settles. Channels in use:
 * - "getDownloadUrl": (fileId) => resolves with a presigned download URL.
 * - "renameOrMove": (type, id, oldPath, newPath) => resolves with "" once
 *   the server-side rename/move is done.
 * - "trash": (type, id) => resolves with "" once trashed server-side.
 * - "newLocalItem": (type, absolutePath, name) => resolves with the new
 *   real File/Folder id once created/uploaded.
 */
export function setBridgeProvider(channel: string, fn: (...args: [...string[], number]) => void): void;
export function resolveBridgeCall(token: number, result: string): void;
export function rejectBridgeCall(token: number, message: string): void;

export function startWatchingLocalChanges(rootPath: string): void;
export function stopWatchingLocalChanges(): void;
