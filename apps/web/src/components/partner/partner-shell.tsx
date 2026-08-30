"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { api } from "@/lib/api-client";
import type { PartnerUser } from "@/types/partner";
import { PartnerContext } from "./partner-context";

type LoadState = { status: "loading" } | { status: "ready"; partner: PartnerUser } | { status: "error" };

export function PartnerShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const fetchMe = useCallback(async () => {
    const { partner } = await api.get<{ partner: PartnerUser }>("/partner/auth/me");
    setState({ status: "ready", partner });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchMe().catch(() => {
      if (!cancelled) router.replace("/partner/login");
    });
    return () => {
      cancelled = true;
    };
  }, [fetchMe, router]);

  async function handleLogout() {
    await api.post("/partner/auth/logout").catch(() => {});
    router.replace("/partner/login");
  }

  if (state.status !== "ready") {
    return <div className="bg-background min-h-screen w-full" />;
  }

  return (
    <PartnerContext.Provider value={{ partner: state.partner }}>
      <div className="bg-background text-foreground min-h-screen w-full">
        <header className="border-border-subtle bg-background flex h-16 shrink-0 items-center gap-6 border-b px-6">
          <Link href="/partner" className="text-foreground shrink-0 text-[17px] font-bold tracking-[-0.02em]">
            Nextlayer Cloud <span className="text-ink-450 font-medium">Partner</span>
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-ink-450 text-[13px]">
              {state.partner.name} ·{" "}
              <code className="bg-surface-muted rounded px-1.5 py-0.5 text-[12px] font-semibold">
                {state.partner.code}
              </code>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-ink-600 hover:bg-surface-muted flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1200px] px-6 py-10">{children}</main>
      </div>
    </PartnerContext.Provider>
  );
}
