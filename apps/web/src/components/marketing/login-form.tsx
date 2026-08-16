"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormField } from "@/components/common/form-field";
import { API_URL } from "@/constants/site";
import { safeRedirect } from "@/lib/safe-redirect";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Incorrect email or password.");
        setSubmitting(false);
        return;
      }

      router.push(safeRedirect(searchParams.get("redirect")));
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="mb-6 text-center text-2xl font-bold tracking-[-0.02em]">
        Log in to Nextlayer Cloud
      </h1>

      {error && (
        <div className="border-error-border bg-error-bg text-error-text mb-5 rounded-lg border p-3.5 text-[13px]">
          {error}
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FormField
          id="l-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between">
            <label htmlFor="l-pass" className="text-ink-700 text-[13px] font-semibold">
              Password
            </label>
            <Link href="/forgot-password" className="text-[13px]">
              Forgot password?
            </Link>
          </div>
          <input
            id="l-pass"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="border-input rounded-lg border px-3.5 py-[11px] text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-primary-foreground mt-1 rounded-lg p-[13px] text-[15px] font-semibold disabled:opacity-60"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <div className="text-ink-550 mt-6 text-center text-[13px]">
        Your files stay private, encrypted, and yours.
      </div>
      <div className="mt-5 text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href={`/register${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}>Sign up</Link>
      </div>
    </>
  );
}
