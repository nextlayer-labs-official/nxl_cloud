"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { PortalOrganization, PortalUser } from "@/types/portal";
import { PortalContext, type PortalContextValue } from "./portal-context";
import { PortalSidebar } from "./portal-sidebar";

type LoadState =
  { status: "loading" } | { status: "ready"; value: PortalContextValue } | { status: "error" };

export function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ user: PortalUser; organization: PortalOrganization }>("/auth/me")
      .then(({ user, organization }) => {
        if (!cancelled) setState({ status: "ready", value: { user, organization } });
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state.status !== "ready") {
    return (
      <div className="flex min-h-screen w-full">
        <div className="border-border-subtle bg-surface-muted-2 h-screen w-[264px] shrink-0 animate-pulse border-r" />
        <div className="flex-1 px-12 py-10">
          <div className="bg-surface-muted h-7 w-40 animate-pulse rounded-lg" />
          <div className="mt-8 grid grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-surface-muted h-28 animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PortalContext.Provider value={state.value}>
      <div className="bg-background text-foreground flex min-h-screen w-full">
        <PortalSidebar />
        <main className="min-w-0 flex-1 px-12 py-10">{children}</main>
      </div>
    </PortalContext.Provider>
  );
}
