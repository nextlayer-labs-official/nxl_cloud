"use client";

import { Download, Loader2, Trash2, X } from "lucide-react";
import { InfoToggleButton } from "./info-panel";

interface SelectionBarProps {
  count: number;
  busy: boolean;
  onClear: () => void;
  onDownload: () => void;
  onDelete: () => void;
  infoOpen: boolean;
  onToggleInfo: () => void;
}

/** Replaces the breadcrumb/title header row in place while items are selected — matches Drive's contextual toolbar swap rather than adding a separate banner. */
export function SelectionBar({ count, busy, onClear, onDownload, onDelete, infoOpen, onToggleInfo }: SelectionBarProps) {
  return (
    <>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="text-ink-450 hover:bg-surface-muted hover:text-foreground cursor-pointer rounded-md p-1.5"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-foreground text-[15px] font-semibold">{count} selected</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onDownload}
          disabled={busy}
          className="text-ink-600 hover:bg-surface-muted flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="text-error-text hover:bg-error-bg flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Delete
        </button>
        <InfoToggleButton active={infoOpen} onClick={onToggleInfo} />
      </div>
    </>
  );
}
