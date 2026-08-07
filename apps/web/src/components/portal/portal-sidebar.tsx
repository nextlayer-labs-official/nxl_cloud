"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Folder, LogOut, Settings } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePortal } from "./portal-context";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function PortalSidebar() {
  const { user, organization } = usePortal();
  const router = useRouter();
  const pathname = usePathname();
  const [usedBytes, setUsedBytes] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<{ usedBytes: number }>("/organizations/usage")
      .then(({ usedBytes }) => setUsedBytes(usedBytes))
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await api.post("/auth/logout").catch(() => {});
    router.replace("/login");
  }

  return (
    <aside className="border-border-subtle bg-surface-muted-2 sticky top-0 flex h-screen w-[264px] shrink-0 flex-col border-r px-4 py-6">
      <Link href="/portal" className="text-foreground px-2 text-[18px] font-bold tracking-[-0.02em]">
        Nextlayer Cloud
      </Link>

      <div className="border-border-subtle bg-background mt-6 flex items-center gap-2.5 rounded-xl border px-3 py-2.5">
        <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold">
          {organization.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-foreground truncate text-[13px] font-semibold">
            {organization.name}
          </div>
          <div className="text-ink-450 text-[11px]">
            {usedBytes === null ? "—" : `${formatBytes(usedBytes)} used`}
          </div>
        </div>
      </div>

      <nav className="mt-6 flex flex-col gap-0.5">
        <Link
          href="/portal"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold",
            pathname === "/portal" || pathname.startsWith("/portal/folder")
              ? "bg-accent text-accent-foreground"
              : "text-ink-600 hover:bg-background",
          )}
        >
          <Folder className="h-4 w-4" />
          My Files
        </Link>
        <Link
          href="/portal/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold",
            pathname === "/portal/settings"
              ? "bg-accent text-accent-foreground"
              : "text-ink-600 hover:bg-background",
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </nav>

      <div className="flex-1" />

      <div className="border-border-subtle flex items-center gap-2.5 border-t pt-4">
        <div className="bg-ink-300/25 text-ink-700 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold">
          {initials(user.name) || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-foreground truncate text-[13px] font-medium">{user.name}</div>
          <div className="text-ink-450 truncate text-[11px]">{user.email}</div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          className="text-ink-400 hover:text-foreground hover:bg-background cursor-pointer rounded-lg p-1.5"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
