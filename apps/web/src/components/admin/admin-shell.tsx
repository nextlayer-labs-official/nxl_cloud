"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/types/admin";
import { AdminContext } from "./admin-context";

type LoadState = { status: "loading" } | { status: "ready"; adminUser: AdminUser } | { status: "error" };

const NAV_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/organizations", label: "Organizations" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/audit-log", label: "Audit Log" },
];

/** "/admin" is a prefix of every other admin path, so it needs an exact match; every other link should stay highlighted on its own nested/detail routes (e.g. /admin/organizations/:id). */
function isNavLinkActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const fetchMe = useCallback(async () => {
    const { adminUser } = await api.get<{ adminUser: AdminUser }>("/admin/auth/me");
    setState({ status: "ready", adminUser });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchMe().catch(() => {
      if (!cancelled) router.replace("/admin/login");
    });
    return () => {
      cancelled = true;
    };
  }, [fetchMe, router]);

  async function handleLogout() {
    await api.post("/admin/auth/logout").catch(() => {});
    router.replace("/admin/login");
  }

  if (state.status !== "ready") {
    return <div className="bg-background min-h-screen w-full" />;
  }

  return (
    <AdminContext.Provider value={{ adminUser: state.adminUser }}>
      <div className="bg-background text-foreground min-h-screen w-full">
        <header className="border-border-subtle bg-background flex h-16 shrink-0 items-center gap-6 border-b px-6">
          <Link href="/admin" className="text-foreground shrink-0 text-[17px] font-bold tracking-[-0.02em]">
            Nextlayer Cloud <span className="text-ink-450 font-medium">Admin</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-[13px] font-semibold",
                  isNavLinkActive(pathname, link.href)
                    ? "bg-accent text-accent-foreground"
                    : "text-ink-600 hover:bg-surface-muted",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-ink-450 text-[13px]">{state.adminUser.email}</div>
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
    </AdminContext.Provider>
  );
}
