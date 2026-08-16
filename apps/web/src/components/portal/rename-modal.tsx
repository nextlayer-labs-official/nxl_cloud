"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface RenameModalProps {
  currentName: string;
  onCancel: () => void;
  onRename: (name: string) => void;
  renaming: boolean;
  error: string | null;
}

/** Matches Drive's actual rename UX — a small popup dialog, not inline in-row editing. */
export function RenameModal({ currentName, onCancel, onRename, renaming, error }: RenameModalProps) {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed === currentName) {
      onCancel();
      return;
    }
    onRename(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="border-border-subtle bg-background w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
      >
        <h2 className="text-foreground mb-5 truncate text-[17px] font-semibold">
          Rename &quot;{currentName}&quot;
        </h2>
        <input
          ref={inputRef}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-input bg-background focus:border-primary w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none"
        />
        {error && <p className="text-error-text mt-2 text-[13px]">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-foreground hover:bg-surface-muted cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={renaming || !name.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {renaming && <Loader2 className="h-4 w-4 animate-spin" />}
            Rename
          </button>
        </div>
      </form>
    </div>
  );
}
