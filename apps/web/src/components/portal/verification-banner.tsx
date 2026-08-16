"use client";

import { useState } from "react";
import { Mail, X } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { usePortal } from "./portal-context";

/** Reminder, not a one-time toast — dismiss is local-only state, so it reappears on the next full load if the user still hasn't verified. */
export function VerificationBanner() {
  const { user } = usePortal();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user.emailVerifiedAt || dismissed) return null;

  async function handleResend() {
    setSending(true);
    setError(null);
    try {
      await api.post("/auth/resend-verification");
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't resend the email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-warn/30 bg-warn/10 flex shrink-0 items-center justify-between gap-3 border-b px-6 py-2.5 text-[13px]">
      <div className="flex items-center gap-2">
        <Mail className="text-warn h-4 w-4 shrink-0" />
        <span className="text-ink-700">
          {sent ? "Verification email sent — check your inbox." : "Please verify your email address."}
        </span>
        {error && <span className="text-error-text">{error}</span>}
      </div>
      <div className="flex items-center gap-3">
        {!sent && (
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="text-warn cursor-pointer font-semibold underline disabled:opacity-60"
          >
            {sending ? "Sending…" : "Resend email"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="text-ink-450 hover:text-foreground cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
