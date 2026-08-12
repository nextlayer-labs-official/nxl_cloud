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

interface FolderCardProps {
  folder: FolderItem;
  selected: boolean;
  /** Returns true if the click was consumed by selection (shouldn't navigate). */
  onSelectAttempt: (e: React.MouseEvent) => boolean;
  onToggleCheckbox: () => void;
  onShare: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}

export function FolderCard({
  folder,
  selected,
  onSelectAttempt,
  onToggleCheckbox,
  onShare,
  onDelete,
  onRename,
}: FolderCardProps) {
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

  // preventDefault is called synchronously in the <Link>'s own onClick (below) —
  // by the time this delayed handler runs, the browser default is already
  // suppressed, so it's safe to navigate programmatically here instead.
  function openFolder(e: React.MouseEvent) {
    const handled = onSelectAttempt(e);
    if (!handled) router.push(`/portal/folder/${folder.id}`);
  }

  const handleClick = useClickOrDoubleClick(openFolder, startRename);

  return (
    <ItemContextMenu
      actions={[
        { label: "Rename", icon: Pencil, onSelect: startRename },
        { label: "Share", icon: Share2, onSelect: onShare },
        { label: "Delete", icon: Trash2, onSelect: onDelete, destructive: true, separatorBefore: true },
      ]}
    >
      <div className={cn("group relative", selected && "z-[1]")}>
        <Link
          href={`/portal/folder/${folder.id}`}
          onClick={(e) => {
            e.preventDefault();
            handleClick(e);
          }}
          className={cn(
            "border-border-subtle bg-background hover:border-border-strong hover:shadow-[0_8px_20px_-12px_oklch(0.22_0.02_260_/_0.2)] flex items-center gap-3 rounded-xl border p-4 transition",
            selected && "border-primary ring-primary/20 ring-2",
          )}
        >
          <ItemCheckbox checked={selected} onToggle={onToggleCheckbox} label={`Select ${folder.name}`} />
          <div className="bg-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <NavIcon icon={FolderIcon} className="text-accent-foreground h-5 w-5" />
          </div>
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
  );
}
