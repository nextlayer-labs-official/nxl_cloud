"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { DistributorUser } from "@/types/distributor";
import { DistributorContext } from "./distributor-context";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; distributor: DistributorUser }
  | { status: "error" };

const NAV_LINKS = [
  { href: "/distributor", label: "Partners" },
  { href: "/distributor/wallet", label: "Wallet" },
];

function isNavLinkActive(pathname: string, href: string): boolean {
  return href === "/distributor" ? pathname === "/distributor" || pathname.startsWith("/distributor/partners") : pathname.startsWith(href);
}

export function DistributorShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const fetchMe = useCallback(async () => {
    const { distributor } = await api.get<{ distributor: DistributorUser }>("/distributor/auth/me");
    setState({ status: "ready", distributor });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchMe().catch(() => {
      if (!cancelled) router.replace("/distributor/login");
    });
    return () => {
      cancelled = true;
    };
  }, [fetchMe, router]);

  async function handleLogout() {
    await api.post("/distributor/auth/logout").catch(() => {});
    router.replace("/distributor/login");
  }

  if (state.status !== "ready") {
    return <div className="bg-background min-h-screen w-full" />;
  }

  return (
    <DistributorContext.Provider value={{ distributor: state.distributor }}>
      <div className="bg-background text-foreground min-h-screen w-full">
        <header className="border-border-subtle bg-background flex h-16 shrink-0 items-center gap-6 border-b px-6">
          <Link
            href="/distributor"
            className="text-foreground shrink-0 text-[17px] font-bold tracking-[-0.02em]"
          >
            Skylyer <span className="text-ink-450 font-medium">Distributor</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-[13px] font-semibold",
                  isNavLinkActive(pathname, link.href)
                    ? "bg-surface-muted text-foreground"
                    : "text-ink-550 hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-ink-450 text-[13px]">{state.distributor.name}</div>
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
    </DistributorContext.Provider>
  );
}
