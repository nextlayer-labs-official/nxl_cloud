"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  CreditCard,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Receipt,
  ScrollText,
  Search,
  Settings,
  Share2,
  Users,
  Users2,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminAuditLogEntry, AdminUser } from "@/types/admin";
import { AdminContext } from "./admin-context";
import { humanizeAuditAction } from "./audit-action-labels";
import { CommandPalette } from "./command-palette";

type LoadState = { status: "loading" } | { status: "ready"; adminUser: AdminUser } | { status: "error" };

const NAV_LINKS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/admin/distributors", label: "Distributors", icon: Share2 },
  { href: "/admin/partners", label: "Partners", icon: Users2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/plans", label: "Plans & Pricing", icon: CreditCard },
  { href: "/admin/storage-usage", label: "Storage & Usage", icon: HardDrive },
  { href: "/admin/billing", label: "Billing & Invoices", icon: Receipt },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

/** "/admin" is a prefix of every other admin path, so it needs an exact match; every other link should stay highlighted on its own nested/detail routes (e.g. /admin/organizations/:id). */
function isNavLinkActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function initials(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

/** Reuses the same Recent Activity feed as the Overview page — no separate Notification model, since there's nothing else today that would populate one. */
function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<AdminAuditLogEntry[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || entries) return;
    api
      .get<AdminAuditLogEntry[]>("/admin/audit-log?take=6")
      .then(setEntries)
      .catch(() => setEntries([]));
  }, [open, entries]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-ink-600 hover:bg-surface-muted relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {entries && entries.length > 0 && (
          <span className="bg-error-text absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full" />
        )}
      </button>
      {open && (
        <div className="border-border-subtle bg-background absolute right-0 z-20 mt-2 w-80 rounded-xl border shadow-lg">
          <div className="border-border-subtle border-b px-4 py-3">
            <div className="text-foreground text-[13px] font-semibold">Recent activity</div>
          </div>
          <div className="divide-border-subtle max-h-80 divide-y overflow-y-auto">
            {!entries ? (
              <div className="text-ink-450 px-4 py-6 text-center text-[13px]">Loading…</div>
            ) : entries.length === 0 ? (
              <div className="text-ink-450 px-4 py-6 text-center text-[13px]">Nothing yet.</div>
            ) : (
              entries.map((entry) => {
                const adminName = (entry.metadata?.adminName as string | undefined) ?? entry.actor?.name ?? "System";
                return (
                  <div key={entry.id} className="px-4 py-2.5 text-[13px]">
                    <div className="text-foreground">
                      <span className="font-semibold">{adminName}</span> {humanizeAuditAction(entry.action)}
                    </div>
                    <div className="text-ink-450 text-[11px]">
                      {entry.organization?.name ?? "Platform-wide"} · {formatRelativeTime(entry.createdAt)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
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

  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (state.status !== "ready") {
    return <div className="bg-background min-h-screen w-full" />;
  }

  return (
    <AdminContext.Provider value={{ adminUser: state.adminUser }}>
      <div className="bg-background text-foreground flex h-screen w-full overflow-hidden">
        <aside className="border-border-subtle bg-background flex h-full w-60 shrink-0 flex-col overflow-y-auto border-r px-3 py-5">
          <Link href="/admin" className="text-foreground mb-6 flex items-center gap-2 px-2 text-[17px] font-bold tracking-[-0.02em]">
            Skylyer <span className="text-ink-450 font-medium">Admin</span>
          </Link>
          <nav className="flex flex-1 flex-col gap-0.5">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const active = isNavLinkActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold",
                    active ? "bg-accent text-accent-foreground" : "text-ink-600 hover:bg-surface-muted",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="from-accent/15 to-accent/5 border-border-subtle mt-4 rounded-xl border bg-gradient-to-b p-4">
            <div className="text-foreground text-[13px] font-semibold">Powering secure cloud for your business</div>
            <div className="text-ink-450 mt-2 text-[12px] font-medium">Skylyer</div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="border-border-subtle bg-background flex h-16 shrink-0 items-center gap-4 border-b px-6">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="border-border-subtle bg-surface-muted hover:border-ink-450 flex max-w-md flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-left"
            >
              <Search className="text-ink-450 h-4 w-4 shrink-0" />
              <span className="text-ink-450 w-full text-[13px]">Search organizations, users, invoices...</span>
              <kbd className="text-ink-450 border-border-subtle bg-background shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold">
                Ctrl K
              </kbd>
            </button>
            <div className="ml-auto flex items-center gap-2">
              <NotificationsBell />
              <div className="border-border-subtle mx-1 h-6 border-l" />
              <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold">
                {initials(state.adminUser.name || state.adminUser.email)}
              </div>
              <div className="hidden flex-col sm:flex">
                <span className="text-foreground text-[13px] font-semibold">{state.adminUser.email}</span>
                <span className="text-ink-450 text-[11px]">Administrator</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-ink-600 hover:bg-surface-muted flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1200px] px-6 py-10">{children}</div>
          </main>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </AdminContext.Provider>
  );
}
