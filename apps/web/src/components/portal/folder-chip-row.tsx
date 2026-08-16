"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { AccessLevel, FolderItem } from "@/types/portal";
import { FolderChip } from "./folder-chip";

interface FolderChipRowProps {
  folders: FolderItem[];
  isSelected: (id: string) => boolean;
  isFocused?: (id: string) => boolean;
  accessLevel?: AccessLevel;
  onSelectAttempt: (folder: FolderItem, index: number) => (e: React.MouseEvent) => boolean;
  onToggleCheckbox: (folder: FolderItem, index: number) => void;
  onShare: (folder: FolderItem) => void;
  onMove: (folder: FolderItem) => void;
  onToggleStar: (folder: FolderItem) => void;
  onDelete: (folder: FolderItem) => void;
  onRename: (folder: FolderItem) => void;
}

/** Compact, collapsible "Folders" row rendered above the file list in both grid and list mode. */
export function FolderChipRow({
  folders,
  isSelected,
  isFocused,
  accessLevel,
  onSelectAttempt,
  onToggleCheckbox,
  onShare,
  onMove,
  onToggleStar,
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
              focused={isFocused?.(folder.id)}
              accessLevel={accessLevel}
              onSelectAttempt={onSelectAttempt(folder, i)}
              onToggleCheckbox={() => onToggleCheckbox(folder, i)}
              onShare={() => onShare(folder)}
              onMove={() => onMove(folder)}
              onToggleStar={() => onToggleStar(folder)}
              onDelete={() => onDelete(folder)}
              onRename={() => onRename(folder)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
