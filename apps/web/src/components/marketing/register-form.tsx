"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/common/form-field";
import { API_URL } from "@/constants/site";

const STRENGTH_COLORS = ["bg-ink-400", "bg-destructive", "bg-warn", "bg-success"];

function computeStrength(value: string) {
  let strength = 0;
  if (value.length > 0) strength = 1;
  if (value.length >= 8) strength = 2;
  if (value.length >= 8 && /[0-9]/.test(value) && /[A-Z]/.test(value)) strength = 3;
  return strength;
}

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = computeStrength(password);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, company, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
        setError(message ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      router.push("/portal");
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="mb-6 text-center text-2xl font-bold tracking-[-0.02em]">
        Start your free trial
      </h1>

      {error && (
        <div className="border-error-border bg-error-bg text-error-text mb-5 rounded-lg border p-3.5 text-[13px]">
          {error}
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FormField
          id="r-name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
        />
        <FormField
          id="r-email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <FormField
          id="r-company"
          label="Workspace name (optional)"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          autoComplete="organization"
          placeholder={name ? `${name}'s Workspace` : "Defaults to your name"}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="r-pass" className="text-ink-700 text-[13px] font-semibold">
            Password
          </label>
          <input
            id="r-pass"
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
        <label className="text-muted-foreground flex items-start gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I agree to the <Link href="/terms">Terms of Service</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>
          </span>
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary text-primary-foreground mt-1 rounded-lg p-[13px] text-[15px] font-semibold disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div className="text-ink-550 mt-6 text-center text-[13px]">
        Your files stay private, encrypted, and yours.
      </div>
      <div className="mt-5 text-center text-sm">
        Already have an account? <Link href="/login">Log in</Link>
      </div>
    </>
  );
}
