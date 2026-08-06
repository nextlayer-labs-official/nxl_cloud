"use client";

import { useState } from "react";
import Link from "next/link";
import { FormField } from "@/components/common/form-field";

const STRENGTH_COLORS = ["bg-ink-400", "bg-destructive", "bg-warn", "bg-success"];

function computeStrength(value: string) {
  let strength = 0;
  if (value.length > 0) strength = 1;
  if (value.length >= 8) strength = 2;
  if (value.length >= 8 && /[0-9]/.test(value) && /[A-Z]/.test(value)) strength = 3;
  return strength;
}

export function RegisterForm() {
  const [strength, setStrength] = useState(0);

  return (
    <>
      <h1 className="mb-6 text-center text-2xl font-bold tracking-[-0.02em]">
        Start your free trial
      </h1>

      <div className="mb-6 flex flex-col gap-2.5">
        <button
          type="button"
          className="border-input bg-background cursor-pointer rounded-lg border p-[11px] text-sm font-semibold"
        >
          Continue with Google
        </button>
        <button
          type="button"
          className="border-input bg-background cursor-pointer rounded-lg border p-[11px] text-sm font-semibold"
        >
          Continue with Microsoft
        </button>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="bg-border h-px flex-1" />
        <div className="text-ink-550 text-xs">or</div>
        <div className="bg-border h-px flex-1" />
      </div>

      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <FormField id="r-name" label="Name" />
        <FormField id="r-email" label="Work email" type="email" />
        <FormField id="r-company" label="Company" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="r-pass" className="text-ink-700 text-[13px] font-semibold">
            Password
          </label>
          <input
            id="r-pass"
            type="password"
            onChange={(e) => setStrength(computeStrength(e.target.value))}
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
          <input type="checkbox" className="mt-0.5" />
          <span>
            I agree to the <Link href="/terms">Terms of Service</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>
          </span>
        </label>
        <button
          type="submit"
          className="bg-primary text-primary-foreground mt-1 rounded-lg p-[13px] text-[15px] font-semibold"
        >
          Create account
        </button>
      </form>

      <div className="text-ink-550 mt-6 text-center text-[13px]">
        Enterprise-grade security. SOC 2 Type II certified.
      </div>
      <div className="mt-5 text-center text-sm">
        Already have an account? <Link href="/login">Log in</Link>
      </div>
    </>
  );
}
