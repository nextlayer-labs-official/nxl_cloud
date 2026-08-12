"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "list";

interface ViewModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div className="border-input flex shrink-0 items-center rounded-lg border p-0.5">
      <button
        type="button"
        aria-pressed={mode === "list"}
        aria-label="List view"
        onClick={() => onChange("list")}
        className={cn(
          "flex cursor-pointer items-center rounded-md p-1.5",
          mode === "list" ? "bg-surface-muted text-foreground" : "text-ink-450 hover:text-foreground",
        )}
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-pressed={mode === "grid"}
        aria-label="Grid view"
        onClick={() => onChange("grid")}
        className={cn(
          "flex cursor-pointer items-center rounded-md p-1.5",
          mode === "grid" ? "bg-surface-muted text-foreground" : "text-ink-450 hover:text-foreground",
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}
