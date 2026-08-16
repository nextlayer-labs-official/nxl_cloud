"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Folder as FolderIcon, FolderInput, Link2, Pencil, Share2, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FolderItem } from "@/types/portal";
import type { ItemHandle } from "./file-row";
import { ItemCheckbox } from "./item-checkbox";
import { ItemContextMenu } from "./item-context-menu";
import { useClickOrDoubleClick } from "./use-click-or-double-click";

interface FolderChipProps {
  folder: FolderItem;
  selected: boolean;
  focused?: boolean;
  /** Returns true if the click was consumed by selection (shouldn't navigate). */
  onSelectAttempt: (e: React.MouseEvent) => boolean;
  onToggleCheckbox: () => void;
  onShare: () => void;
  onMove: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}

/** Compact pill-style folder item — Drive always renders folders this way, in their own row, regardless of the file list's grid/list mode. */
export const FolderChip = forwardRef<ItemHandle, FolderChipProps>(function FolderChip(
  { folder, selected, focused, onSelectAttempt, onToggleCheckbox, onShare, onMove, onToggleStar, onDelete, onRename },
  ref,
) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  function startRename() {
    setDraft(folder.name);
    setRenaming(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  useImperativeHandle(ref, () => ({ startRename }));

  function commitRename() {
    setRenaming(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== folder.name) onRename(trimmed);
  }

  // preventDefault is called synchronously in the <Link>'s own onClick (below) —
  // by the time this delayed handler runs, the browser default is already
  // suppressed, so it's safe to navigate programmatically here instead.
  function openFolder(e: React.MouseEvent) {
    const handled = onSelectAttempt(e);
    if (!handled) router.push(`/portal/folder/${folder.id}`);
  }

  const handleClick = useClickOrDoubleClick(openFolder, startRename);

  return (
    // Boundary between this item's own trigger and any ancestor canvas-level
    // ItemContextMenu — stops an item right-click from also opening the
    // canvas menu (Radix triggers preventDefault but never stopPropagation).
    <div className="contents" onContextMenu={(e) => e.stopPropagation()}>
      <ItemContextMenu
        actions={[
          { label: "Rename", icon: Pencil, onSelect: startRename },
          { label: "Share", icon: Share2, onSelect: onShare },
          { label: "Move to...", icon: FolderInput, onSelect: onMove },
          { label: folder.isStarred ? "Remove from Starred" : "Add to Starred", icon: Star, onSelect: onToggleStar },
          { label: "Delete", icon: Trash2, onSelect: onDelete, destructive: true, separatorBefore: true },
        ]}
      >
        <div className={cn("group relative inline-flex", selected && "z-[1]")}>
          <Link
            href={`/portal/folder/${folder.id}`}
            onClick={(e) => {
              e.preventDefault();
              handleClick(e);
            }}
            className={cn(
              "border-border-subtle bg-surface-muted hover:bg-surface-muted-2 hover:border-border-strong flex h-10 min-w-[180px] max-w-[240px] items-center gap-2 rounded-lg border py-1.5 pr-3 pl-2 transition",
              selected && "border-primary ring-primary/20 ring-2",
              focused && "outline-primary outline-2 outline-offset-1",
            )}
          >
            <ItemCheckbox checked={selected} onToggle={onToggleCheckbox} label={`Select ${folder.name}`} />
            <FolderIcon className="text-ink-400 h-4 w-4 shrink-0" />
            {renaming ? (
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
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
                className="border-input bg-background text-foreground min-w-0 flex-1 rounded-md border px-1.5 py-0.5 text-[13px] font-medium outline-none"
              />
            ) : (
              <span className="text-foreground min-w-0 truncate text-[13px] font-medium">{folder.name}</span>
            )}
            {folder.isShared && <Link2 className="text-ink-400 h-3.5 w-3.5 shrink-0" aria-label="Shared" />}
          </Link>
          <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onShare();
              }}
              aria-label={`Share ${folder.name}`}
              className="text-ink-400 hover:text-primary bg-background border-border-subtle cursor-pointer rounded-full border p-1 shadow-sm"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
              aria-label={`Delete ${folder.name}`}
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
