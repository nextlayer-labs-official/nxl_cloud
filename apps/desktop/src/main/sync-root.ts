import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { app } from "electron";
import native from "@nextlayer/desktop-native";
import mime from "mime-types";
import { ApiError, type ApiClient } from "./api-client";
import { getIconIcoPath } from "./brand";
import type { FolderContents } from "../shared/types";

let connected = false;
let watching = false;
let onAuthExpired: (() => void) | null = null;
// Explorer can trigger many hydration attempts at once (thumbnails for
// every visible placeholder) — fire the callback for the first expired-
// session failure only, not once per file.
let authExpiredFired = false;

// Maps a local folder's absolute path to its real Skylyer folder id (null
// for the sync root itself, i.e. the account's root folder) — built while
// populating placeholders, and extended as new local folders get uploaded.
// Needed to resolve "which remote folder does this local path belong to"
// when a rename/move/new-item event only gives us a local path.
const localPathToFolderId = new Map<string, string | null>();

export function getSyncRootPath(): string {
  return join(app.getPath("documents"), "Skylyer");
}

function syncRootIdFor(userId: string): string {
  return `Skylyer!${userId}`;
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
        if (err instanceof ApiError && err.status === 401 && !authExpiredFired) {
          authExpiredFired = true;
          onAuthExpired?.();
        }
        native.rejectBridgeCall(token, err instanceof Error ? err.message : "Bridge call failed.");
      },
    );
  };
}

/**
 * Registers (or re-registers — idempotent) the real Explorer nav-pane entry,
 * wires the native<->JS bridge channels, connects the Cloud Filter callback
 * table, populates the whole existing tree as placeholders, and starts
 * watching for local changes to push back up. Left registered across app
 * restarts (`stopSyncRoot` only disconnects) so the Explorer entry persists
 * like OneDrive's does even when the app isn't running — `unregisterSyncRoot`
 * is only for sign-out.
 */
export async function startSyncRoot(
  apiClient: ApiClient,
  userId: string,
  authExpired: () => void,
): Promise<void> {
  const rootPath = getSyncRootPath();
  if (!existsSync(rootPath)) mkdirSync(rootPath, { recursive: true });
  localPathToFolderId.clear();
  localPathToFolderId.set(rootPath, null);
  onAuthExpired = authExpired;
  authExpiredFired = false;

  native.setBridgeProvider(
    "getDownloadUrl",
    bridgeHandler(async (fileId) => apiClient.getDownloadUrl(fileId)),
  );

  native.setBridgeProvider(
    "renameOrMove",
    bridgeHandler(async (type, id, oldPath, newPath) => {
      await handleRenameOrMove(apiClient, type as "file" | "folder", id, oldPath, newPath);
      return "";
    }),
  );

  native.setBridgeProvider(
    "trash",
    bridgeHandler(async (type, id) => {
      if (type === "folder") await apiClient.trashFolder(id);
      else await apiClient.trashFile(id);
      return "";
    }),
  );

  native.setBridgeProvider(
    "newLocalItem",
    bridgeHandler(async (type, absolutePath, name) => uploadNewLocalItem(apiClient, type as "file" | "folder", absolutePath, name)),
  );

  native.registerSyncRoot(rootPath, syncRootIdFor(userId), "Skylyer", getIconIcoPath());
  native.connectSyncRoot(rootPath);
  connected = true;

  await populateFolder(apiClient, null, rootPath);

  native.startWatchingLocalChanges(rootPath);
  watching = true;
}

async function populateFolder(apiClient: ApiClient, folderId: string | null, localPath: string): Promise<void> {
  const contents: FolderContents = await apiClient.listFolder(folderId);

  const items = [
    ...contents.folders.map((f) => ({
      id: f.id,
      name: f.name,
      isFolder: true,
      sizeBytes: 0,
      createdAtUnixMs: new Date(f.createdAt).getTime(),
      updatedAtUnixMs: new Date(f.createdAt).getTime(),
    })),
    ...contents.files.map((f) => ({
      id: f.id,
      name: f.name,
      isFolder: false,
      sizeBytes: f.sizeBytes,
      createdAtUnixMs: new Date(f.createdAt).getTime(),
      updatedAtUnixMs: new Date(f.updatedAt).getTime(),
    })),
  ];

  if (items.length > 0) native.createPlaceholders(localPath, items);

  for (const folder of contents.folders) {
    const childPath = join(localPath, folder.name);
    localPathToFolderId.set(childPath, folder.id);
    await populateFolder(apiClient, folder.id, childPath);
  }
}

async function handleRenameOrMove(
  apiClient: ApiClient,
  type: "file" | "folder",
  id: string,
  oldPath: string,
  newPath: string,
): Promise<void> {
  const oldParentDir = dirname(oldPath);
  const newParentDir = dirname(newPath);
  const newName = basename(newPath);

  if (newParentDir !== oldParentDir) {
    const newParentId = localPathToFolderId.get(newParentDir);
    if (newParentId !== undefined) {
      if (type === "folder") await apiClient.moveFolder(id, newParentId);
      else await apiClient.moveFile(id, newParentId);
    }
  }

  if (basename(oldPath) !== newName) {
    if (type === "folder") await apiClient.renameFolder(id, newName);
    else await apiClient.renameFile(id, newName);
  }

  if (type === "folder") {
    // Everything tracked under the old path now lives under the new one.
    for (const [path, id2] of [...localPathToFolderId]) {
      if (path === oldPath) {
        localPathToFolderId.delete(path);
        localPathToFolderId.set(newPath, id2);
      } else if (path.startsWith(oldPath + "\\")) {
        localPathToFolderId.delete(path);
        localPathToFolderId.set(newPath + path.slice(oldPath.length), id2);
      }
    }
  }
}

async function uploadNewLocalItem(
  apiClient: ApiClient,
  type: "file" | "folder",
  absolutePath: string,
  name: string,
): Promise<string> {
  const parentPath = dirname(absolutePath);
  const parentFolderId = localPathToFolderId.get(parentPath) ?? null;

  if (type === "folder") {
    const folder = await apiClient.createFolder(name, parentFolderId);
    localPathToFolderId.set(absolutePath, folder.id);
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
  return file.id;
}

/** Disconnects the live callback table and stops watching for local changes. Does NOT unregister — see the doc comment on startSyncRoot. */
export function stopSyncRoot(): void {
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
