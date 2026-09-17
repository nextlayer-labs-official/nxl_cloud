import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { app } from "electron";
import native from "@nextlayer/desktop-native";
import mime from "mime-types";
import { ApiError, type ApiClient } from "./api-client";
import { getIconIcoPath } from "./brand";
import { loadSyncState, saveSyncState, type SyncState } from "./sync-state";
import type { FileItem, FolderContents, FolderItem } from "../shared/types";

const kRemoteReconcileIntervalMs = 60_000;

let connected = false;
let watching = false;
let onAuthExpired: (() => void) | null = null;
// Explorer can trigger many hydration attempts at once (thumbnails for
// every visible placeholder) — fire the callback for the first expired-
// session failure only, not once per file.
let authExpiredFired = false;

let currentUserId: string | null = null;
let syncState: SyncState = new Map();
let remoteReconcileInterval: NodeJS.Timeout | null = null;

// Coalesces bursts of "localTreeChanged" bridge calls (one native debounce
// window can still overlap a slow-running previous pass) into "run again
// once the current pass finishes" rather than piling up concurrent passes.
let localReconcileInFlight: Promise<void> | null = null;
let localReconcilePendingRerun = false;

let remoteReconcileInFlight = false;

export function getSyncRootPath(): string {
  return join(app.getPath("documents"), "Skylyer");
}

function syncRootIdFor(userId: string): string {
  return `Skylyer!${userId}`;
}

function persistSyncState(): void {
  if (currentUserId) saveSyncState(currentUserId, syncState);
}

function checkAuthExpired(err: unknown): boolean {
  if (err instanceof ApiError && err.status === 401) {
    if (!authExpiredFired) {
      authExpiredFired = true;
      onAuthExpired?.();
    }
    return true;
  }
  return false;
}

/**
 * Wraps a bridge handler so a thrown/rejected error becomes a
 * rejectBridgeCall instead of an unhandled rejection. Also watches for an
 * expired/invalid session (401) — without this, the only sign anything's
 * wrong is Explorer's own generic "couldn't complete this operation" error
 * when a placeholder fails to hydrate (e.g. Explorer silently trying to
 * generate a thumbnail for it), which gives the user no idea they just need
 * to sign in again. Popping the app to the login screen at that point is a
 * far clearer experience — this is what "click Skylyer in the sidebar and
 * get a real error instead of a login prompt" was actually about.
 */
function bridgeHandler(fn: (...args: string[]) => Promise<string>) {
  return (...allArgs: unknown[]) => {
    const token = allArgs[allArgs.length - 1] as number;
    const args = allArgs.slice(0, -1) as string[];
    fn(...args).then(
      (result) => native.resolveBridgeCall(token, result),
      (err: unknown) => {
        checkAuthExpired(err);
        native.rejectBridgeCall(token, err instanceof Error ? err.message : "Bridge call failed.");
      },
    );
  };
}

/**
 * Registers (or re-registers — idempotent) the real Explorer nav-pane entry,
 * wires the native<->JS bridge channels, connects the Cloud Filter callback
 * table, reconciles both directions against the persisted sync state, and
 * starts watching for local changes (event-driven) plus a 60s timer for
 * remote changes. Left registered across app restarts (`stopSyncRoot` only
 * disconnects) so the Explorer entry persists like OneDrive's does even
 * when the app isn't running — `unregisterSyncRoot` is only for sign-out.
 */
export async function startSyncRoot(apiClient: ApiClient, userId: string, authExpired: () => void): Promise<void> {
  const rootPath = getSyncRootPath();
  if (!existsSync(rootPath)) mkdirSync(rootPath, { recursive: true });

  onAuthExpired = authExpired;
  authExpiredFired = false;
  currentUserId = userId;
  syncState = loadSyncState(userId);

  native.setBridgeProvider(
    "getDownloadUrl",
    bridgeHandler(async (fileId) => apiClient.getDownloadUrl(fileId)),
  );

  native.setBridgeProvider(
    "newLocalItem",
    bridgeHandler(async (type, absolutePath, name) => uploadNewLocalItem(apiClient, type as "file" | "folder", absolutePath, name)),
  );

  native.setBridgeProvider(
    "hydrationComplete",
    bridgeHandler(async (fileId) => {
      recordHydrationFingerprint(rootPath, fileId);
      return "";
    }),
  );

  native.setBridgeProvider(
    "localTreeChanged",
    bridgeHandler(async () => {
      scheduleLocalReconciliation(apiClient);
      return "";
    }),
  );

  native.registerSyncRoot(rootPath, syncRootIdFor(userId), "Skylyer", getIconIcoPath());
  native.connectSyncRoot(rootPath);
  connected = true;

  // Order matters: push offline local changes up before pulling remote
  // state down, so something the user deleted locally while the app was
  // closed doesn't briefly reappear.
  await runLocalReconciliation(apiClient);
  await runRemoteReconciliationGuarded(apiClient);

  native.startWatchingLocalChanges(rootPath);
  watching = true;

  if (remoteReconcileInterval) clearInterval(remoteReconcileInterval);
  remoteReconcileInterval = setInterval(() => runRemoteReconciliationGuarded(apiClient), kRemoteReconcileIntervalMs);
}

function recordHydrationFingerprint(rootPath: string, fileId: string): void {
  const entry = syncState.get(fileId);
  if (!entry) return;
  try {
    const stat = statSync(join(rootPath, entry.localRelativePath));
    entry.localSizeBytes = stat.size;
    entry.localMtimeMs = stat.mtimeMs;
    persistSyncState();
  } catch {
    // Gone already (deleted between hydration finishing and this running) — nothing to record.
  }
}

function scheduleLocalReconciliation(apiClient: ApiClient): void {
  if (localReconcileInFlight) {
    localReconcilePendingRerun = true;
    return;
  }
  localReconcileInFlight = runLocalReconciliation(apiClient)
    .catch((err) => console.error("[Skylyer] local reconciliation failed:", err))
    .finally(() => {
      localReconcileInFlight = null;
      if (localReconcilePendingRerun) {
        localReconcilePendingRerun = false;
        scheduleLocalReconciliation(apiClient);
      }
    });
}

async function runRemoteReconciliationGuarded(apiClient: ApiClient): Promise<void> {
  if (remoteReconcileInFlight) return;
  remoteReconcileInFlight = true;
  try {
    await runRemoteReconciliation(apiClient);
  } catch (err) {
    console.error("[Skylyer] remote reconciliation failed:", err);
  } finally {
    remoteReconcileInFlight = false;
  }
}

/**
 * Local half of reconciliation: walks the real placeholder tree straight
 * off disk (native.readLocalPlaceholderTree, backed by CfGetPlaceholderInfo
 * — correct even after the app was closed while Explorer changed things)
 * and diffs it against the persisted sync state to catch local renames,
 * moves, deletes, and content edits that the live watcher's fast path
 * doesn't handle. Runs once at startup and again (debounced) after any
 * local filesystem change settles.
 */
async function runLocalReconciliation(apiClient: ApiClient): Promise<void> {
  const rootPath = getSyncRootPath();
  const localEntries = native.readLocalPlaceholderTree(rootPath);
  const localById = new Map(localEntries.map((entry) => [entry.id, entry] as const));
  const localPathToId = new Map(localEntries.map((entry) => [entry.path, entry.id] as const));

  let changed = false;

  for (const [id, entry] of [...syncState]) {
    const local = localById.get(id);

    if (!local) {
      // Tracked as synced, but gone from disk — the user deleted it locally.
      try {
        if (entry.isFolder) await apiClient.trashFolder(id);
        else await apiClient.trashFile(id);
      } catch (err) {
        console.error(`[Skylyer] local delete of ${id} failed to propagate:`, err);
        if (checkAuthExpired(err)) return;
        continue; // Leave it tracked — retry next pass rather than losing track of it.
      }
      syncState.delete(id);
      changed = true;
      continue;
    }

    const newRelativePath = relative(rootPath, local.path);
    if (newRelativePath !== entry.localRelativePath) {
      const parentPath = dirname(local.path);
      const newParentId = parentPath === rootPath ? null : (localPathToId.get(parentPath) ?? undefined);
      const newName = basename(local.path);

      // Parent not itself a recognized placeholder yet (e.g. it was just
      // created in the same batch and hasn't reached the front of this
      // loop) — retry next pass instead of guessing.
      if (newParentId !== undefined) {
        try {
          if (newParentId !== entry.remoteParentId) {
            if (entry.isFolder) await apiClient.moveFolder(id, newParentId);
            else await apiClient.moveFile(id, newParentId);
          }
          if (newName !== entry.remoteName) {
            if (entry.isFolder) await apiClient.renameFolder(id, newName);
            else await apiClient.renameFile(id, newName);
          }
          entry.remoteName = newName;
          entry.remoteParentId = newParentId;
          entry.localRelativePath = newRelativePath;
          changed = true;
          // A plain rename/move clears the placeholder's in-sync flag
          // (confirmed empirically — CfUpdatePlaceholder's DEHYDRATE later
          // fails with ERROR_CLOUD_FILE_NOT_IN_SYNC otherwise) even though
          // nothing about the file's actual sync state changed.
          try {
            native.markLocalPathInSync(local.path);
          } catch (markErr) {
            console.error(`[Skylyer] failed to re-mark ${id} in sync after rename:`, markErr);
          }
        } catch (err) {
          console.error(`[Skylyer] local rename/move of ${id} failed to propagate:`, err);
          if (checkAuthExpired(err)) return;
        }
      }
    }

    if (!entry.isFolder && (local.sizeBytes !== entry.localSizeBytes || local.lastWriteTimeUnixMs !== entry.localMtimeMs)) {
      try {
        const name = basename(local.path);
        const mimeType = mime.lookup(name) || "application/octet-stream";
        const { uploadUrl, storageKey, storageProvider } = await apiClient.requestVersionUploadUrl(
          id,
          mimeType,
          local.sizeBytes,
        );
        await apiClient.putFile(uploadUrl, createReadStream(local.path), mimeType);
        const updated = await apiClient.confirmVersion(id, { mimeType, sizeBytes: local.sizeBytes, storageKey, storageProvider });
        entry.remoteSizeBytes = updated.sizeBytes;
        entry.remoteUpdatedAt = updated.updatedAt;
        entry.localSizeBytes = local.sizeBytes;
        entry.localMtimeMs = local.lastWriteTimeUnixMs;
        changed = true;
      } catch (err) {
        console.error(`[Skylyer] local content edit of ${id} failed to upload:`, err);
        if (checkAuthExpired(err)) return;
      }
    }
  }

  if (changed) persistSyncState();
}

interface RemoteEntry {
  id: string;
  name: string;
  isFolder: boolean;
  sizeBytes: number;
  updatedAt: string; // "" for folders.
  createdAt: string;
}

function toRemoteEntries(contents: FolderContents): RemoteEntry[] {
  return [
    ...contents.folders.map((f: FolderItem) => ({ id: f.id, name: f.name, isFolder: true, sizeBytes: 0, updatedAt: "", createdAt: f.createdAt })),
    ...contents.files.map((f: FileItem) => ({ id: f.id, name: f.name, isFolder: false, sizeBytes: f.sizeBytes, updatedAt: f.updatedAt, createdAt: f.createdAt })),
  ];
}

/**
 * Remote half of reconciliation: recursively walks the account's folder
 * tree (same traversal shape as the old one-shot populateFolder) and diffs
 * each level against the persisted sync state — creating local
 * placeholders for new remote items, applying renames/moves and content
 * edits to existing ones, and (in a final pass, once the whole tree is
 * known) removing local placeholders for anything trashed remotely.
 */
async function runRemoteReconciliation(apiClient: ApiClient): Promise<void> {
  const rootPath = getSyncRootPath();
  const seenIds = new Set<string>();

  await reconcileRemoteLevel(apiClient, null, rootPath, seenIds);
  applyRemoteDeletions(rootPath, seenIds);

  persistSyncState();
}

async function reconcileRemoteLevel(
  apiClient: ApiClient,
  remoteFolderId: string | null,
  localPath: string,
  seenIds: Set<string>,
): Promise<void> {
  const rootPath = getSyncRootPath();
  const contents = await apiClient.listFolder(remoteFolderId);
  const remoteEntries = toRemoteEntries(contents);

  const newItems: { remote: RemoteEntry; item: import("@nextlayer/desktop-native").PlaceholderItem }[] = [];

  for (const remote of remoteEntries) {
    seenIds.add(remote.id);
    const existing = syncState.get(remote.id);

    if (!existing) {
      const createdAtUnixMs = new Date(remote.createdAt).getTime();
      newItems.push({
        remote,
        item: {
          id: remote.id,
          name: remote.name,
          isFolder: remote.isFolder,
          sizeBytes: remote.sizeBytes,
          createdAtUnixMs,
          updatedAtUnixMs: remote.updatedAt ? new Date(remote.updatedAt).getTime() : createdAtUnixMs,
        },
      });
      continue;
    }

    if (remote.name !== existing.remoteName || remoteFolderId !== existing.remoteParentId) {
      const oldPath = join(rootPath, existing.localRelativePath);
      const newPath = join(localPath, remote.name);
      try {
        native.renameLocalPath(oldPath, newPath);
        existing.remoteName = remote.name;
        existing.remoteParentId = remoteFolderId;
        existing.localRelativePath = relative(rootPath, newPath);
        // Same in-sync-flag reset as the local-rename branch — a plain
        // rename clears it regardless of which side initiated it.
        try {
          native.markLocalPathInSync(newPath);
        } catch (markErr) {
          console.error(`[Skylyer] failed to re-mark ${remote.id} in sync after rename:`, markErr);
        }
      } catch (err) {
        console.error(`[Skylyer] failed to apply remote rename/move of ${remote.id} locally:`, err);
      }
    }

    if (!remote.isFolder && remote.updatedAt !== existing.remoteUpdatedAt) {
      const absPath = join(rootPath, existing.localRelativePath);
      const updatedAtMs = new Date(remote.updatedAt).getTime();
      try {
        native.dehydrateAndRefreshPlaceholder(absPath, remote.sizeBytes, updatedAtMs);
        existing.remoteUpdatedAt = remote.updatedAt;
        existing.remoteSizeBytes = remote.sizeBytes;
        // The dehydrate call above just changed this placeholder's on-disk
        // size/mtime immediately (even though content isn't re-fetched
        // until next open) — record that now, the same way hydrationComplete
        // does for the opposite direction, or the next LOCAL pass would
        // mistake this for a user edit and try to re-upload it.
        existing.localSizeBytes = remote.sizeBytes;
        existing.localMtimeMs = updatedAtMs;
      } catch (err) {
        console.error(`[Skylyer] failed to apply remote content edit of ${remote.id} locally:`, err);
      }
    }
  }

  if (newItems.length > 0) {
    native.createPlaceholders(localPath, newItems.map(({ item }) => item));
    for (const { remote, item } of newItems) {
      const path = join(localPath, remote.name);
      syncState.set(remote.id, {
        id: remote.id,
        isFolder: remote.isFolder,
        localRelativePath: relative(rootPath, path),
        remoteName: remote.name,
        remoteParentId: remoteFolderId,
        remoteUpdatedAt: remote.updatedAt,
        remoteSizeBytes: remote.sizeBytes,
        localSizeBytes: item.sizeBytes,
        localMtimeMs: item.updatedAtUnixMs,
      });
    }
  }

  for (const folder of contents.folders) {
    await reconcileRemoteLevel(apiClient, folder.id, join(localPath, folder.name), seenIds);
  }
}

/** Anything still tracked as synced but not seen anywhere in the fresh remote walk was trashed server-side. */
function applyRemoteDeletions(rootPath: string, seenIds: Set<string>): void {
  const toDelete = [...syncState.entries()].filter(([id]) => !seenIds.has(id));
  // Deepest paths first so a trashed folder's children (also being removed
  // this same pass, since they're gone from the remote walk too) never hit
  // "directory not empty".
  toDelete.sort((a, b) => b[1].localRelativePath.split("\\").length - a[1].localRelativePath.split("\\").length);

  for (const [id, entry] of toDelete) {
    const absPath = join(rootPath, entry.localRelativePath);
    try {
      native.deleteLocalPath(absPath, entry.isFolder);
    } catch (err) {
      console.error(`[Skylyer] failed to remove locally-stale ${id}:`, err);
      continue;
    }
    syncState.delete(id);
  }
}

/** Resolves a local directory's Skylyer folder id from sync state — used to know which folder a brand-new local item's upload belongs under. */
function resolveParentFolderId(rootPath: string, parentPath: string): string | null {
  if (parentPath === rootPath) return null;
  for (const entry of syncState.values()) {
    if (entry.isFolder && join(rootPath, entry.localRelativePath) === parentPath) return entry.id;
  }
  return null;
}

async function uploadNewLocalItem(
  apiClient: ApiClient,
  type: "file" | "folder",
  absolutePath: string,
  name: string,
): Promise<string> {
  const rootPath = getSyncRootPath();
  const parentPath = dirname(absolutePath);
  const parentFolderId = resolveParentFolderId(rootPath, parentPath);

  if (type === "folder") {
    const folder = await apiClient.createFolder(name, parentFolderId);
    syncState.set(folder.id, {
      id: folder.id,
      isFolder: true,
      localRelativePath: relative(rootPath, absolutePath),
      remoteName: folder.name,
      remoteParentId: parentFolderId,
      remoteUpdatedAt: "",
      remoteSizeBytes: 0,
      localSizeBytes: 0,
      localMtimeMs: Date.now(),
    });
    persistSyncState();
    return folder.id;
  }

  const stat = statSync(absolutePath);
  const mimeType = mime.lookup(name) || "application/octet-stream";
  const { uploadUrl, storageKey, storageProvider } = await apiClient.requestUploadUrl(
    name,
    mimeType,
    stat.size,
    parentFolderId,
  );
  await apiClient.putFile(uploadUrl, createReadStream(absolutePath), mimeType);
  const file = await apiClient.confirmUpload({
    name,
    mimeType,
    sizeBytes: stat.size,
    folderId: parentFolderId,
    storageKey,
    storageProvider,
  });
  syncState.set(file.id, {
    id: file.id,
    isFolder: false,
    localRelativePath: relative(rootPath, absolutePath),
    remoteName: file.name,
    remoteParentId: parentFolderId,
    remoteUpdatedAt: file.updatedAt,
    remoteSizeBytes: file.sizeBytes,
    localSizeBytes: stat.size,
    localMtimeMs: stat.mtimeMs,
  });
  persistSyncState();
  return file.id;
}

/** Disconnects the live callback table, stops the 60s remote poll, and stops watching for local changes. Does NOT unregister — see the doc comment on startSyncRoot. */
export function stopSyncRoot(): void {
  if (remoteReconcileInterval) {
    clearInterval(remoteReconcileInterval);
    remoteReconcileInterval = null;
  }
  if (watching) {
    native.stopWatchingLocalChanges();
    watching = false;
  }
  if (!connected) return;
  native.disconnectSyncRoot();
  connected = false;
}

/** Fully removes the Explorer entry — only for sign-out, not a normal app quit. */
export function removeSyncRoot(userId: string): void {
  stopSyncRoot();
  native.unregisterSyncRoot(syncRootIdFor(userId));
}

/** Used by the NSIS uninstall hook (build/installer.nsh) so uninstalling actually removes the Explorer entry for whichever account was last logged in, instead of leaving it orphaned. */
export function unregisterAllStaleSyncRoots(): void {
  native.unregisterAllSyncRoots();
}
