"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import type { AccessRequestStatus } from "@/types/portal";

interface RequestAccessPanelProps {
  resourceType: "file" | "folder";
  resourceId: string;
  resourceName: string;
  initialRequestStatus: AccessRequestStatus | null | undefined;
}

/** Drive-style "you need access" screen — shown by file-view.tsx and file-browser.tsx when a resource exists but isn't shared with the current user. */
export function RequestAccessPanel({
  resourceType,
  resourceId,
  resourceName,
  initialRequestStatus,
}: RequestAccessPanelProps) {
  const [status, setStatus] = useState<AccessRequestStatus | null>(initialRequestStatus ?? null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest() {
    setSubmitting(true);
    setError(null);
    try {
      const endpoint =
        resourceType === "file" ? `/files/${resourceId}/request-access` : `/folders/${resourceId}/request-access`;
      await api.post<{ status: AccessRequestStatus }>(endpoint, message.trim() ? { message: message.trim() } : undefined);
      setStatus("PENDING");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send the request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-border-subtle mx-auto flex max-w-md flex-col items-center rounded-xl border border-dashed py-16 text-center">
      <div className="bg-surface-muted mb-4 flex h-14 w-14 items-center justify-center rounded-full">
        <Lock className="text-ink-400 h-6 w-6" />
      </div>
      <p className="text-foreground text-[15px] font-semibold">You need access</p>
      <p className="text-ink-450 mt-1 max-w-sm text-sm">
        {resourceName ? `"${resourceName}" isn't shared with you yet.` : "This isn't shared with you yet."}
      </p>

      {status === "PENDING" ? (
        <div className="text-ink-600 mt-5 flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Access requested — you&apos;ll be notified if it&apos;s granted.
        </div>
      ) : (
        <div className="mt-4 flex w-full max-w-xs flex-col items-center gap-2.5">
          {status === "DENIED" && (
            <p className="text-ink-450 text-sm">Your last request was declined. You can ask again below.</p>
          )}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message (optional)"
            rows={2}
            className="border-input bg-surface-muted-2 text-foreground w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none"
          />
          <button
            type="button"
            onClick={handleRequest}
            disabled={submitting}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Request access
          </button>
        </div>
      )}
      {error && <p className="text-error-text mt-3 text-[13px]">{error}</p>}
    </div>
  );
}
