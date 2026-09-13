"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";

interface DeleteOrganizationModalProps {
  organization: { id: string; name: string };
  onClose: () => void;
  onDeleted: () => void;
}

/**
 * Irreversible — permanently deletes the org, every member whose only
 * membership is this org, and every file/version object across whichever
 * storage provider each one actually lives in (see
 * AdminService.deleteOrganization). Type-to-confirm the exact org name,
 * same pattern as GitHub's repo deletion, since there's no undo.
 */
export function DeleteOrganizationModal({ organization, onClose, onDeleted }: DeleteOrganizationModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const canDelete = confirmText === organization.name;

  async function handleDelete() {
    if (!canDelete) return;
    setError(null);
    setDeleting(true);
    try {
      await api.delete(`/admin/organizations/${organization.id}`);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete this organization.");
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-error-border bg-background flex w-full max-w-md flex-col overflow-hidden rounded-2xl border shadow-2xl"
      >
        <div className="border-border-subtle flex items-start justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-error-text text-[17px] font-semibold">Delete organization</h2>
            <p className="text-ink-450 text-[13px]">{organization.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-450 hover:bg-surface-muted hover:text-foreground -mr-1.5 -mt-1 cursor-pointer rounded-lg p-1.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="border-error-border bg-error-bg text-error-text rounded-lg border px-3.5 py-3 text-[13px]">
            This permanently deletes the organization, every file and folder in it, every member whose only
            account is here, and every file object in storage. This cannot be undone.
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-ink-700 text-[13px] font-semibold">
              Type <span className="font-mono font-bold">{organization.name}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
              className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="border-border-subtle shrink-0 border-t px-6 py-4">
          {error && <p className="text-error-text mb-3 text-[13px]">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-foreground hover:bg-surface-muted cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!canDelete || deleting}
              className="bg-error-text flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete organization
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
