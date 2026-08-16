"use client";

import { Download, FolderInput, Link2, Pencil, Share2, Star, Trash2 } from "lucide-react";
import { getFileIcon } from "@/lib/file-icons";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AccessLevel, FileItem } from "@/types/portal";
import { ItemCheckbox } from "./item-checkbox";
import { ItemContextMenu } from "./item-context-menu";

interface FileRowProps {
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

/** List-mode row for a file, part of the unified folders+files table. */
export function FileRow({
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
}: FileRowProps) {
  const isOwner = accessLevel === "OWNER";
  const canEdit = accessLevel !== "VIEWER";
  const Icon = getFileIcon(file.mimeType);

  function handleClick(e: React.MouseEvent) {
    const handled = onSelectAttempt(e);
    if (!handled) onOpen();
  }

  const actions = [
    { label: "Download", icon: Download, onSelect: onDownload },
    ...(canEdit ? [{ label: "Rename", icon: Pencil, onSelect: onRename }] : []),
    ...(isOwner ? [{ label: "Share", icon: Share2, onSelect: onShare }] : []),
    ...(isOwner ? [{ label: "Move to...", icon: FolderInput, onSelect: onMove }] : []),
    { label: file.isStarred ? "Remove from Starred" : "Add to Starred", icon: Star, onSelect: onToggleStar },
    ...(canEdit
      ? [{ label: "Delete", icon: Trash2, onSelect: onDelete, destructive: true, separatorBefore: true }]
      : []),
  ];

  return (
    <tr
      onContextMenu={(e) => e.stopPropagation()}
      className={cn(
        "group border-border-subtle hover:bg-surface-muted-2 border-b last:border-b-0",
        selected && "bg-surface-muted-2",
        focused && "outline-primary outline-2 -outline-offset-2",
      )}
    >
      <td className="px-5 py-3">
        <ItemContextMenu actions={actions}>
          <div onClick={handleClick} className="flex cursor-pointer items-center gap-3">
            <ItemCheckbox checked={selected} onToggle={onToggleCheckbox} label={`Select ${file.name}`} />
            <Icon className="text-ink-400 h-[18px] w-[18px] shrink-0" />
            <span className="text-foreground truncate text-[14px] font-medium hover:underline">
              {file.name}
            </span>
            {file.isShared && <Link2 className="text-ink-400 h-3.5 w-3.5 shrink-0" aria-label="Shared" />}
            <span className="text-ink-450 text-[13px] sm:hidden">{formatBytes(file.sizeBytes)}</span>
          </div>
        </ItemContextMenu>
      </td>
      <td className="text-ink-450 hidden px-5 py-3 text-[13px] whitespace-nowrap sm:table-cell">
        <ItemContextMenu actions={actions}>
          <div className="contents">{formatBytes(file.sizeBytes)}</div>
        </ItemContextMenu>
      </td>
      <td className="text-ink-450 hidden px-5 py-3 text-[13px] whitespace-nowrap md:table-cell">
        <ItemContextMenu actions={actions}>
          <div className="contents">{formatDate(file.updatedAt)}</div>
        </ItemContextMenu>
      </td>
      <td className="px-5 py-3">
        <ItemContextMenu actions={actions}>
          <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={onDownload}
              className="text-ink-400 hover:text-foreground hover:bg-background cursor-pointer rounded-md p-1.5"
              aria-label={`Download ${file.name}`}
            >
              <Download className="h-4 w-4" />
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={onShare}
                className="text-ink-400 hover:text-foreground hover:bg-background cursor-pointer rounded-md p-1.5"
                aria-label={`Share ${file.name}`}
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={onDelete}
                className="text-ink-400 hover:text-error-text hover:bg-background cursor-pointer rounded-md p-1.5"
                aria-label={`Delete ${file.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </ItemContextMenu>
      </td>
    </tr>
  );
}
