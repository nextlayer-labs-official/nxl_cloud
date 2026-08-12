"use client";

import { Download, Loader2, Trash2, X } from "lucide-react";

interface BulkActionToolbarProps {
  count: number;
  busy: boolean;
  onClear: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

export function BulkActionToolbar({ count, busy, onClear, onDownload, onDelete }: BulkActionToolbarProps) {
  return (
    <div className="border-border-subtle bg-surface-muted-2 mb-4 flex items-center justify-between rounded-xl border px-4 py-2.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="text-ink-450 hover:bg-background hover:text-foreground cursor-pointer rounded-md p-1"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-foreground text-[13px] font-semibold">
          {count} selected
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onDownload}
          disabled={busy}
          className="text-ink-600 hover:bg-background flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="text-error-text hover:bg-error-bg flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Delete
        </button>
      </div>
    </div>
  );
}
