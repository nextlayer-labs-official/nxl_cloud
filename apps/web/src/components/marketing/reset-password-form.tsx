"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { API_URL } from "@/constants/site";

const STRENGTH_COLORS = ["bg-ink-400", "bg-destructive", "bg-warn", "bg-success"];

function computeStrength(value: string) {
  let strength = 0;
  if (value.length > 0) strength = 1;
  if (value.length >= 8) strength = 2;
  if (value.length >= 8 && /[0-9]/.test(value) && /[A-Z]/.test(value)) strength = 3;
  return strength;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = computeStrength(password);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is missing its token.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "This reset link is invalid or has expired.");
        setSubmitting(false);
        return;
      }

      setDone(true);
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <h1 className="mb-3 text-2xl font-bold tracking-[-0.02em]">Password reset</h1>
        <p className="text-ink-550 mb-6 text-sm">
          Your password has been updated. You&apos;ve been logged out everywhere else for
          security — log in again with your new password.
        </p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="bg-primary text-primary-foreground inline-block cursor-pointer rounded-lg px-5 py-2.5 text-sm font-semibold"
        >
          Log in
        </button>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-center text-2xl font-bold tracking-[-0.02em]">Choose a new password</h1>

      {error && (
        <div className="border-error-border bg-error-bg text-error-text mb-5 rounded-lg border p-3.5 text-[13px]">
          {error}
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rp-pass" className="text-ink-700 text-[13px] font-semibold">
            New password
          </label>
          <input
            id="rp-pass"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            className="border-input rounded-lg border px-3.5 py-[11px] text-sm"
          />
          <div className="bg-border-subtle mt-1 h-1 overflow-hidden rounded-full">
            <div
              className={`h-full transition-[width] duration-200 ease-in-out ${STRENGTH_COLORS[strength]}`}
              style={{ width: strength === 0 ? "0%" : `${(strength / 3) * 100}%` }}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting || !token}
          className="bg-primary text-primary-foreground mt-1 rounded-lg p-[13px] text-[15px] font-semibold disabled:opacity-60"
        >
          {submitting ? "Resetting…" : "Reset password"}
        </button>
      </form>

      <div className="mt-5 text-center text-sm">
        <Link href="/login">Back to log in</Link>
      </div>
    </>
  );
}
