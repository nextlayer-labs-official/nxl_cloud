"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Download, FolderInput, Link2, Pencil, Share2, Star, Trash2 } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FileItem } from "@/types/portal";
import { FileThumbnail } from "./file-thumbnail";
import { ItemCheckbox } from "./item-checkbox";
import { ItemContextMenu } from "./item-context-menu";
import type { ItemHandle } from "./file-row";
import { useClickOrDoubleClick } from "./use-click-or-double-click";

interface FileCardProps {
  file: FileItem;
  selected: boolean;
  focused?: boolean;
  onSelectAttempt: (e: React.MouseEvent) => boolean;
  onToggleCheckbox: () => void;
  onOpen: () => void;
  onDownload: () => void;
  onShare: () => void;
  onMove: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}

/** Grid-mode card for a file, with a real thumbnail for images. */
export const FileCard = forwardRef<ItemHandle, FileCardProps>(function FileCard(
  {
    file,
    selected,
    focused,
    onSelectAttempt,
    onToggleCheckbox,
    onOpen,
    onDownload,
    onShare,
    onMove,
    onToggleStar,
    onDelete,
    onRename,
  },
  ref,
) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(file.name);
  const inputRef = useRef<HTMLInputElement>(null);

  function startRename() {
    setDraft(file.name);
    setRenaming(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  useImperativeHandle(ref, () => ({ startRename }));

  function commitRename() {
    setRenaming(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== file.name) onRename(trimmed);
  }

  function openOrSelect(e: React.MouseEvent) {
    const handled = onSelectAttempt(e);
    if (!handled) onOpen();
  }

  const handleClick = useClickOrDoubleClick(openOrSelect, startRename);

  return (
    // Boundary between this item's own trigger and any ancestor canvas-level
    // ItemContextMenu — stops an item right-click from also opening the
    // canvas menu (Radix triggers preventDefault but never stopPropagation).
    <div className="contents" onContextMenu={(e) => e.stopPropagation()}>
      <ItemContextMenu
        actions={[
          { label: "Download", icon: Download, onSelect: onDownload },
          { label: "Rename", icon: Pencil, onSelect: startRename },
          { label: "Share", icon: Share2, onSelect: onShare },
          { label: "Move to...", icon: FolderInput, onSelect: onMove },
          { label: file.isStarred ? "Remove from Starred" : "Add to Starred", icon: Star, onSelect: onToggleStar },
          { label: "Delete", icon: Trash2, onSelect: onDelete, destructive: true, separatorBefore: true },
        ]}
      >
        <div className={cn("group relative", selected && "z-[1]")}>
          <div
            onClick={handleClick}
            className={cn(
              "border-border-subtle bg-background hover:border-border-strong hover:shadow-[0_8px_20px_-12px_oklch(0.22_0.02_260_/_0.2)] flex cursor-pointer flex-col gap-2.5 rounded-xl border p-3 transition",
              selected && "border-primary ring-primary/20 ring-2",
              focused && "outline-primary outline-2 outline-offset-1",
            )}
          >
            <div className="relative">
              <FileThumbnail fileId={file.id} mimeType={file.mimeType} className="h-24 w-full" />
              <ItemCheckbox
                checked={selected}
                onToggle={onToggleCheckbox}
                label={`Select ${file.name}`}
                className="absolute top-1.5 left-1.5"
              />
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              {renaming ? (
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitRename();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setRenaming(false);
                    }
                  }}
                  className="border-input bg-background text-foreground min-w-0 flex-1 rounded-md border px-2 py-1 text-[13px] font-medium outline-none"
                />
              ) : (
                <span className="text-foreground truncate text-[13px] font-medium">{file.name}</span>
              )}
              {file.isShared && <Link2 className="text-ink-400 h-3.5 w-3.5 shrink-0" aria-label="Shared" />}
            </div>
            <span className="text-ink-450 text-[12px]">{formatBytes(file.sizeBytes)}</span>
          </div>
          <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              aria-label={`Download ${file.name}`}
              className="text-ink-400 hover:text-primary bg-background border-border-subtle cursor-pointer rounded-full border p-1 shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              aria-label={`Share ${file.name}`}
              className="text-ink-400 hover:text-primary bg-background border-border-subtle cursor-pointer rounded-full border p-1 shadow-sm"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label={`Delete ${file.name}`}
              className="text-ink-400 hover:text-error-text bg-background border-border-subtle cursor-pointer rounded-full border p-1 shadow-sm"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </ItemContextMenu>
    </div>
  );
});
