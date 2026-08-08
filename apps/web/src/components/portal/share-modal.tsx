"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link as LinkIcon } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";

interface ShareModalProps {
  resourceName: string;
  resourceType: "file" | "folder";
  resourceId: string;
  onClose: () => void;
}

export function ShareModal({ resourceName, resourceType, resourceId, onClose }: ShareModalProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const endpoint =
      resourceType === "file" ? `/files/${resourceId}/share` : `/folders/${resourceId}/share`;
    api
      .post<{ url: string }>(endpoint)
      .then(({ url }) => {
        if (!cancelled) setUrl(url);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Couldn't create a share link.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resourceType, resourceId]);

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically — select the link above and copy it manually.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-border-subtle bg-background w-full max-w-md rounded-2xl border p-6 shadow-2xl"
      >
        <h2 className="text-foreground mb-1 truncate text-[17px] font-semibold">
          Share &quot;{resourceName}&quot;
        </h2>
        <p className="text-ink-450 mb-5 text-sm">
          Anyone with the link can view this {resourceType}.
        </p>

        {loading ? (
          <div className="bg-surface-muted h-11 animate-pulse rounded-lg" />
        ) : error ? (
          <p className="text-error-text text-sm">{error}</p>
        ) : (
          <div className="border-input bg-surface-muted-2 flex items-center gap-2 rounded-lg border p-2.5">
            <LinkIcon className="text-ink-400 ml-1 h-4 w-4 shrink-0" />
            <input
              readOnly
              value={url ?? ""}
              onFocus={(e) => e.target.select()}
              className="text-ink-700 min-w-0 flex-1 truncate bg-transparent text-sm outline-none"
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-foreground hover:bg-surface-muted cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Done
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!url}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
