"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { FolderItem } from "@/types/portal";
import { FolderChip } from "./folder-chip";

interface FolderChipRowProps {
  folders: FolderItem[];
  isSelected: (id: string) => boolean;
  onSelectAttempt: (folder: FolderItem, index: number) => (e: React.MouseEvent) => boolean;
  onToggleCheckbox: (folder: FolderItem, index: number) => void;
  onShare: (folder: FolderItem) => void;
  onDelete: (folder: FolderItem) => void;
  onRename: (folder: FolderItem, name: string) => void;
}

/** Compact, collapsible "Folders" row rendered above the file list in both grid and list mode. */
export function FolderChipRow({
  folders,
  isSelected,
  onSelectAttempt,
  onToggleCheckbox,
  onShare,
  onDelete,
  onRename,
}: FolderChipRowProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (folders.length === 0) return null;

  // A selected-then-collapsed folder must never silently disappear from view.
  const effectivelyCollapsed = collapsed && !folders.some((f) => isSelected(f.id));

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="text-ink-450 hover:text-foreground mb-3 flex cursor-pointer items-center gap-1 text-xs font-semibold tracking-wide uppercase"
      >
        Folders
        {effectivelyCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>
      {!effectivelyCollapsed && (
        <div className="flex flex-wrap gap-2">
          {folders.map((folder, i) => (
            <FolderChip
              key={folder.id}
              folder={folder}
              selected={isSelected(folder.id)}
              onSelectAttempt={onSelectAttempt(folder, i)}
              onToggleCheckbox={() => onToggleCheckbox(folder, i)}
              onShare={() => onShare(folder)}
              onDelete={() => onDelete(folder)}
              onRename={(name) => onRename(folder, name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
