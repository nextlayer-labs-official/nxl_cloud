"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { PortalOrganization, PortalUser } from "@/types/portal";
import { BrowserActionsProvider } from "./browser-actions-context";
import { PortalContext, type PortalContextValue } from "./portal-context";
import { PortalSidebar } from "./portal-sidebar";
import { PortalTopBar } from "./portal-topbar";
import { VerificationBanner } from "./verification-banner";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; value: Omit<PortalContextValue, "refresh"> }
  | { status: "error" };

export function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const fetchMe = useCallback(async () => {
    const { user, organization } = await api.get<{
      user: PortalUser;
      organization: PortalOrganization;
    }>("/auth/me");
    setState({ status: "ready", value: { user, organization } });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchMe().catch(() => {
      // Preserves the destination (e.g. a share-email link straight to a
      // folder) through the login round-trip instead of dumping the user
      // back at the generic /portal root once they sign in.
      if (!cancelled) {
        const dest = window.location.pathname + window.location.search;
        router.replace(`/login?redirect=${encodeURIComponent(dest)}`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fetchMe, router]);

  if (state.status !== "ready") {
    return (
      <div className="flex h-screen w-full flex-col">
        <div className="border-border-subtle bg-background h-16 shrink-0 animate-pulse border-b" />
        <div className="flex min-h-0 flex-1">
          <div className="border-border-subtle bg-surface-muted-2 h-full w-[264px] shrink-0 animate-pulse border-r" />
          <div className="flex-1 px-12 py-10">
            <div className="bg-surface-muted h-7 w-40 animate-pulse rounded-lg" />
            <div className="mt-8 grid grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-surface-muted h-28 animate-pulse rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PortalContext.Provider value={{ ...state.value, refresh: fetchMe }}>
      <BrowserActionsProvider>
        <div className="bg-background text-foreground flex h-screen w-full flex-col">
          <PortalTopBar />
          <VerificationBanner />
          <div className="flex min-h-0 flex-1">
            <PortalSidebar />
            <main className="min-w-0 flex-1 overflow-y-auto px-12 py-10">{children}</main>
          </div>
        </div>
      </BrowserActionsProvider>
    </PortalContext.Provider>
  );
}
