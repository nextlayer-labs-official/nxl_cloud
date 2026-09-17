import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";

/**
 * One synced item's last-known-good state — the disambiguator reconciliation
 * needs to tell "brand new on one side" apart from "deleted on the other",
 * and to detect renames/moves/content-edits in either direction. Keyed by
 * the item's real Skylyer id in the in-memory Map this backs.
 */
export interface SyncStateEntry {
  id: string;
  isFolder: boolean;
  /** Relative to the sync root, using the OS's own separators — built via node:path so it matches native paths directly. */
  localRelativePath: string;
  remoteName: string;
  remoteParentId: string | null;
  /** Files only ("" for folders) — the server's last-known updatedAt, used to detect a remote content edit. */
  remoteUpdatedAt: string;
  /** Files only (0 for folders). */
  remoteSizeBytes: number;
  /** Last-synced on-disk size (files only) — a mismatch against the current tree walk means a local edit happened. */
  localSizeBytes: number;
  /** Last-synced on-disk last-write time in unix ms (files only). */
  localMtimeMs: number;
}

export type SyncState = Map<string, SyncStateEntry>;

function statePath(userId: string): string {
  return join(app.getPath("userData"), `sync-state-${userId}.json`);
}

export function loadSyncState(userId: string): SyncState {
  const path = statePath(userId);
  if (!existsSync(path)) return new Map();
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as SyncStateEntry[];
    return new Map(parsed.map((entry) => [entry.id, entry]));
  } catch {
    // Corrupt/unreadable — safer to start fresh than to crash startup; the
    // next reconciliation pass will just re-derive everything from scratch.
    return new Map();
  }
}

export function saveSyncState(userId: string, state: SyncState): void {
  writeFileSync(statePath(userId), JSON.stringify([...state.values()]));
}
