"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { API_URL } from "@/constants/site";

type Status = "verifying" | "success" | "error";

export function VerifyEmailView() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token.");
      return;
    }
    let cancelled = false;
    fetch(`${API_URL}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (cancelled) return;
        if (res.ok) {
          setStatus("success");
        } else {
          const body = await res.json().catch(() => null);
          setStatus("error");
          setMessage(body?.message ?? "This verification link is invalid or has expired.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
          setMessage("Couldn't reach the server. Please try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="text-center">
      <h1 className="mb-3 text-2xl font-bold tracking-[-0.02em]">
        {status === "verifying"
          ? "Verifying your email…"
          : status === "success"
            ? "Email verified"
            : "Verification failed"}
      </h1>
      {status === "error" && message && <p className="text-error-text mb-5 text-sm">{message}</p>}
      {status === "success" && (
        <p className="text-ink-550 mb-5 text-sm">Your email address has been verified.</p>
      )}
      <Link
        href="/portal"
        className="bg-primary text-primary-foreground inline-block rounded-lg px-5 py-2.5 text-sm font-semibold"
      >
        Go to your files
      </Link>
    </div>
  );
}
