"use client";

import { useState } from "react";
import Link from "next/link";
import { FormField } from "@/components/common/form-field";

export function LoginForm() {
  const [error, setError] = useState(false);

  return (
    <>
      <h1 className="mb-6 text-center text-2xl font-bold tracking-[-0.02em]">
        Log in to Nextlayer Cloud
      </h1>

      {error && (
        <div className="border-error-border bg-error-bg text-error-text mb-5 rounded-lg border p-3.5 text-[13px]">
          Incorrect email or password.
        </div>
      )}

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

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(true);
        }}
      >
        <FormField id="l-email" label="Email" type="email" />
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between">
            <label htmlFor="l-pass" className="text-ink-700 text-[13px] font-semibold">
              Password
            </label>
            <Link href="#" className="text-[13px]">
              Forgot password?
            </Link>
          </div>
          <input
            id="l-pass"
            type="password"
            className="border-input rounded-lg border px-3.5 py-[11px] text-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-primary text-primary-foreground mt-1 rounded-lg p-[13px] text-[15px] font-semibold"
        >
          Log in
        </button>
      </form>

      <div className="text-ink-550 mt-6 text-center text-[13px]">
        Enterprise-grade security. SOC 2 Type II certified.
      </div>
      <div className="mt-5 text-center text-sm">
        Don&apos;t have an account? <Link href="/register">Sign up</Link>
      </div>
    </>
  );
}
