"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Folder as FolderIcon, FolderInput, Link2, Pencil, Share2, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccessLevel, FolderItem } from "@/types/portal";
import { ItemCheckbox } from "./item-checkbox";
import { ItemContextMenu } from "./item-context-menu";

interface FolderChipProps {
  folder: FolderItem;
  selected: boolean;
  focused?: boolean;
  /** Defaults to full owner access — a Viewer/Editor browsing a shared folder passes their actual resolved level. */
  accessLevel?: AccessLevel;
  /** Returns true if the click was consumed by selection (shouldn't navigate). */
  onSelectAttempt: (e: React.MouseEvent) => boolean;
  onToggleCheckbox: () => void;
  onShare: () => void;
  onMove: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
  onRename: () => void;
}

/** Compact pill-style folder item — Drive always renders folders this way, in their own row, regardless of the file list's grid/list mode. */
export function FolderChip({
  folder,
  selected,
  focused,
  accessLevel = "OWNER",
  onSelectAttempt,
  onToggleCheckbox,
  onShare,
  onMove,
  onToggleStar,
  onDelete,
  onRename,
}: FolderChipProps) {
  const isOwner = accessLevel === "OWNER";
  const canEdit = accessLevel !== "VIEWER";
  const router = useRouter();

  function openFolder(e: React.MouseEvent) {
    e.preventDefault();
    const handled = onSelectAttempt(e);
    if (!handled) router.push(`/portal/folder/${folder.id}`);
  }

  return (
    // Boundary between this item's own trigger and any ancestor canvas-level
    // ItemContextMenu — stops an item right-click from also opening the
    // canvas menu (Radix triggers preventDefault but never stopPropagation).
    <div className="contents" onContextMenu={(e) => e.stopPropagation()}>
      <ItemContextMenu
        actions={[
          ...(canEdit ? [{ label: "Rename", icon: Pencil, onSelect: onRename }] : []),
          ...(isOwner ? [{ label: "Share", icon: Share2, onSelect: onShare }] : []),
          ...(isOwner ? [{ label: "Move to...", icon: FolderInput, onSelect: onMove }] : []),
          { label: folder.isStarred ? "Remove from Starred" : "Add to Starred", icon: Star, onSelect: onToggleStar },
          ...(canEdit
            ? [{ label: "Delete", icon: Trash2, onSelect: onDelete, destructive: true, separatorBefore: true }]
            : []),
        ]}
      >
        <div className={cn("group relative inline-flex", selected && "z-[1]")}>
          <Link
            href={`/portal/folder/${folder.id}`}
            onClick={openFolder}
            className={cn(
              "border-border-subtle bg-surface-muted hover:bg-surface-muted-2 hover:border-border-strong flex h-10 min-w-[180px] max-w-[240px] items-center gap-2 rounded-lg border py-1.5 pr-3 pl-2 transition",
              selected && "border-primary ring-primary/20 ring-2",
              focused && "outline-primary outline-2 outline-offset-1",
            )}
          >
            <ItemCheckbox checked={selected} onToggle={onToggleCheckbox} label={`Select ${folder.name}`} />
            <FolderIcon className="text-ink-400 h-4 w-4 shrink-0" />
            <span className="text-foreground min-w-0 truncate text-[13px] font-medium">{folder.name}</span>
            {folder.isShared && <Link2 className="text-ink-400 h-3.5 w-3.5 shrink-0" aria-label="Shared" />}
          </Link>
          {(isOwner || canEdit) && (
            <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
              {isOwner && (
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
              )}
              {canEdit && (
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
              )}
            </div>
          )}
        </div>
      </ItemContextMenu>
    </div>
  );
}
