"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogOut, Search, Settings, Sparkles } from "lucide-react";
import { api } from "@/lib/api-client";
import { usePortal } from "./portal-context";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function PortalTopBar() {
  const { user } = usePortal();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/portal?q=${encodeURIComponent(q)}` : "/portal");
  }

  async function handleLogout() {
    await api.post("/auth/logout").catch(() => {});
    router.replace("/login");
  }

  return (
    <header className="border-border-subtle bg-background flex h-16 shrink-0 items-center gap-4 border-b px-5">
      <Link
        href="/portal"
        className="text-foreground shrink-0 text-[18px] font-bold tracking-[-0.02em]"
      >
        Nextlayer Cloud
      </Link>

      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl">
        <div className="relative">
          <Search className="text-ink-400 pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in Nextlayer Cloud"
            className="bg-surface-muted focus:bg-background focus:border-input w-full rounded-full border border-transparent py-2.5 pr-4 pl-11 text-sm outline-none transition-colors"
          />
        </div>
      </form>

      <div className="flex shrink-0 items-center gap-1">
        <Link
          href="/portal/settings"
          aria-label="Settings"
          className="text-ink-450 hover:bg-surface-muted hover:text-foreground rounded-full p-2.5"
        >
          <Settings className="h-[18px] w-[18px]" />
        </Link>

        <Link
          href="/portal/settings?tab=billing"
          className="bg-accent text-accent-foreground hover:bg-accent/80 ml-1 flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Upgrade
        </Link>

        <div ref={menuRef} className="relative ml-1">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Account menu"
            className="bg-ink-300/25 text-ink-700 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[13px] font-semibold"
          >
            {initials(user.name) || "?"}
          </button>
          {menuOpen && (
            <div className="border-border-subtle bg-background absolute top-[calc(100%+8px)] right-0 z-20 w-56 overflow-hidden rounded-xl border shadow-lg">
              <div className="border-border-subtle border-b px-3.5 py-3">
                <div className="text-foreground truncate text-[13px] font-medium">
                  {user.name}
                </div>
                <div className="text-ink-450 truncate text-[12px]">{user.email}</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-foreground hover:bg-surface-muted flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
