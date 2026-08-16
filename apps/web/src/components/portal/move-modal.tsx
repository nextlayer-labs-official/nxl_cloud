"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Folder as FolderIcon, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { BreadcrumbEntry, FolderItem } from "@/types/portal";

interface MoveModalProps {
  label: string;
  /** The folder currently being moved, if any — filtered out of every listing so it (and by extension every descendant, since you can never navigate into it) can't be picked as its own destination. */
  excludeFolderId?: string;
  onClose: () => void;
  onMove: (destinationFolderId: string | null) => Promise<void>;
}

/** Folder-picker modal for "Move to..." — browses the same folder tree as the main browser (GET /folders?parentId=), navigating down via clicks and back up via the breadcrumb. */
export function MoveModal({ label, excludeFolderId, onClose, onMove }: MoveModalProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const query = currentFolderId ? `?parentId=${currentFolderId}` : "";
    Promise.all([
      api.get<{ folders: FolderItem[] }>(`/folders${query}`),
      currentFolderId
        ? api.get<BreadcrumbEntry[]>(`/folders/${currentFolderId}/breadcrumb`)
        : Promise.resolve([]),
    ])
      .then(([contents, crumb]) => {
        if (cancelled) return;
        setFolders(contents.folders);
        setBreadcrumb(crumb);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load folders.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentFolderId]);

  async function handleMoveHere() {
    setMoving(true);
    setError(null);
    try {
      await onMove(currentFolderId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't move.");
      setMoving(false);
    }
  }

  const visibleFolders = folders.filter((f) => f.id !== excludeFolderId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-border-subtle bg-background flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border shadow-2xl"
      >
        <div className="border-border-subtle shrink-0 border-b px-6 py-4">
          <h2 className="text-foreground truncate text-[17px] font-semibold">Move &quot;{label}&quot;</h2>
          <div className="mt-2 flex flex-wrap items-center gap-1 text-[13px]">
            <button
              type="button"
              onClick={() => setCurrentFolderId(null)}
              className={cn(
                "cursor-pointer rounded px-1 hover:underline",
                currentFolderId === null ? "text-foreground font-semibold" : "text-ink-450",
              )}
            >
              My Files
            </button>
            {breadcrumb.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1">
                <ChevronRight className="text-ink-300 h-3 w-3" />
                <button
                  type="button"
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className={cn(
                    "cursor-pointer rounded px-1 hover:underline",
                    i === breadcrumb.length - 1 ? "text-foreground font-semibold" : "text-ink-450",
                  )}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {loading ? (
            <div className="flex flex-col gap-1.5 p-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-surface-muted h-10 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : visibleFolders.length === 0 ? (
            <p className="text-ink-450 px-3 py-8 text-center text-sm">No subfolders here.</p>
          ) : (
            visibleFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setCurrentFolderId(folder.id)}
                className="hover:bg-surface-muted flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-left"
              >
                <FolderIcon className="text-ink-400 h-4 w-4 shrink-0" />
                <span className="text-foreground truncate text-[14px] font-medium">{folder.name}</span>
              </button>
            ))
          )}
        </div>

        {error && <p className="text-error-text px-6 pb-2 text-[13px]">{error}</p>}

        <div className="border-border-subtle flex shrink-0 items-center justify-end gap-2 border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="text-foreground hover:bg-surface-muted cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMoveHere}
            disabled={moving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {moving && <Loader2 className="h-4 w-4 animate-spin" />}
            Move here
          </button>
        </div>
      </div>
    </div>
  );
}
