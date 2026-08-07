"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { PortalOrganization, PortalUser } from "@/types/portal";
import { PortalContext, type PortalContextValue } from "./portal-context";
import { PortalHeader } from "./portal-header";

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
      <div className="text-muted-foreground flex min-h-screen items-center justify-center text-sm">
        Loading…
      </div>
    );
  }

  return (
    <PortalContext.Provider value={state.value}>
      <div className="bg-background text-foreground min-h-screen w-full">
        <PortalHeader />
        <main className="mx-auto max-w-[1080px] px-10 py-10">{children}</main>
      </div>
    </PortalContext.Provider>
  );
}
