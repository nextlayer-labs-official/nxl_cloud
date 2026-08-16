"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { FormField } from "@/components/common/form-field";
import { API_URL } from "@/constants/site";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      // Always show the same success state regardless of the response —
      // matches the backend's anti-enumeration behavior (never reveal
      // whether an account exists for this email).
      setSent(true);
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <h1 className="mb-3 text-2xl font-bold tracking-[-0.02em]">Check your email</h1>
        <p className="text-ink-550 mb-6 text-sm">
          If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your
          password.
        </p>
        <Link href="/login" className="text-sm font-semibold">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-center text-2xl font-bold tracking-[-0.02em]">Reset your password</h1>
      <p className="text-ink-550 mb-6 text-center text-[13px]">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      {error && (
        <div className="border-error-border bg-error-bg text-error-text mb-5 rounded-lg border p-3.5 text-[13px]">
          {error}
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FormField
          id="fp-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-primary-foreground mt-1 rounded-lg p-[13px] text-[15px] font-semibold disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <div className="mt-5 text-center text-sm">
        <Link href="/login">Back to log in</Link>
      </div>
    </>
  );
}
