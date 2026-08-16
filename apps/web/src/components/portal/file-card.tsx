"use client";

import { Download, FolderInput, Link2, Pencil, Share2, Star, Trash2 } from "lucide-react";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AccessLevel, FileItem } from "@/types/portal";
import { FileThumbnail } from "./file-thumbnail";
import { ItemCheckbox } from "./item-checkbox";
import { ItemContextMenu } from "./item-context-menu";

interface FileCardProps {
  file: FileItem;
  selected: boolean;
  focused?: boolean;
  /** Defaults to full owner access — a Viewer/Editor browsing a shared folder passes their actual resolved level. */
  accessLevel?: AccessLevel;
  onSelectAttempt: (e: React.MouseEvent) => boolean;
  onToggleCheckbox: () => void;
  onOpen: () => void;
  onDownload: () => void;
  onShare: () => void;
  onMove: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
  onRename: () => void;
}

/** Grid-mode card for a file, with a real thumbnail for images. */
export function FileCard({
  file,
  selected,
  focused,
  accessLevel = "OWNER",
  onSelectAttempt,
  onToggleCheckbox,
  onOpen,
  onDownload,
  onShare,
  onMove,
  onToggleStar,
  onDelete,
  onRename,
}: FileCardProps) {
  const isOwner = accessLevel === "OWNER";
  const canEdit = accessLevel !== "VIEWER";

  function handleClick(e: React.MouseEvent) {
    const handled = onSelectAttempt(e);
    if (!handled) onOpen();
  }

  return (
    // Boundary between this item's own trigger and any ancestor canvas-level
    // ItemContextMenu — stops an item right-click from also opening the
    // canvas menu (Radix triggers preventDefault but never stopPropagation).
    <div className="contents" onContextMenu={(e) => e.stopPropagation()}>
      <ItemContextMenu
        actions={[
          { label: "Download", icon: Download, onSelect: onDownload },
          ...(canEdit ? [{ label: "Rename", icon: Pencil, onSelect: onRename }] : []),
          ...(isOwner ? [{ label: "Share", icon: Share2, onSelect: onShare }] : []),
          ...(isOwner ? [{ label: "Move to...", icon: FolderInput, onSelect: onMove }] : []),
          { label: file.isStarred ? "Remove from Starred" : "Add to Starred", icon: Star, onSelect: onToggleStar },
          ...(canEdit
            ? [{ label: "Delete", icon: Trash2, onSelect: onDelete, destructive: true, separatorBefore: true }]
            : []),
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
              <span className="text-foreground truncate text-[13px] font-medium">{file.name}</span>
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
            {isOwner && (
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
            )}
            {canEdit && (
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
            )}
          </div>
        </div>
      </ItemContextMenu>
    </div>
  );
}
