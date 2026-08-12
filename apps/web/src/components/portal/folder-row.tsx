"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Folder as FolderIcon, Link2, Pencil, Share2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FolderItem } from "@/types/portal";
import { ItemCheckbox } from "./item-checkbox";
import { ItemContextMenu } from "./item-context-menu";
import { NavIcon } from "./nav-icon";
import { useClickOrDoubleClick } from "./use-click-or-double-click";

interface FolderRowProps {
  folder: FolderItem;
  selected: boolean;
  onSelectAttempt: (e: React.MouseEvent) => boolean;
  onToggleCheckbox: () => void;
  onShare: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}

/** List-mode row for a folder, part of the unified folders+files table (folders sorted first). */
export function FolderRow({
  folder,
  selected,
  onSelectAttempt,
  onToggleCheckbox,
  onShare,
  onDelete,
  onRename,
}: FolderRowProps) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  function startRename() {
    setDraft(folder.name);
    setRenaming(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function commitRename() {
    setRenaming(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== folder.name) onRename(trimmed);
  }

  function openFolder(e: React.MouseEvent) {
    const handled = onSelectAttempt(e);
    if (!handled) router.push(`/portal/folder/${folder.id}`);
  }

  const handleClick = useClickOrDoubleClick(openFolder, startRename);

  return (
    <tr
      className={cn(
        "group border-border-subtle hover:bg-surface-muted-2 border-b last:border-b-0",
        selected && "bg-surface-muted-2",
      )}
    >
      <td className="px-5 py-3">
        <ItemContextMenu
          actions={[
            { label: "Rename", icon: Pencil, onSelect: startRename },
            { label: "Share", icon: Share2, onSelect: onShare },
            { label: "Delete", icon: Trash2, onSelect: onDelete, destructive: true, separatorBefore: true },
          ]}
        >
          <Link
            href={`/portal/folder/${folder.id}`}
            onClick={(e) => {
              e.preventDefault();
              handleClick(e);
            }}
            className="flex items-center gap-3"
          >
            <ItemCheckbox checked={selected} onToggle={onToggleCheckbox} label={`Select ${folder.name}`} />
            <NavIcon icon={FolderIcon} className="text-ink-400 h-[18px] w-[18px] shrink-0" />
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
                className="border-input bg-background text-foreground min-w-0 flex-1 rounded-md border px-2 py-1 text-[14px] font-medium outline-none"
              />
            ) : (
              <span className="text-foreground truncate text-[14px] font-medium">{folder.name}</span>
            )}
            {folder.isShared && <Link2 className="text-ink-400 h-3.5 w-3.5 shrink-0" aria-label="Shared" />}
          </Link>
        </ItemContextMenu>
      </td>
      <td className="text-ink-450 hidden px-5 py-3 text-[13px] whitespace-nowrap sm:table-cell">—</td>
      <td className="text-ink-450 hidden px-5 py-3 text-[13px] whitespace-nowrap md:table-cell">—</td>
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={onShare}
            className="text-ink-400 hover:text-foreground hover:bg-background cursor-pointer rounded-md p-1.5"
            aria-label={`Share ${folder.name}`}
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-ink-400 hover:text-error-text hover:bg-background cursor-pointer rounded-md p-1.5"
            aria-label={`Delete ${folder.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
