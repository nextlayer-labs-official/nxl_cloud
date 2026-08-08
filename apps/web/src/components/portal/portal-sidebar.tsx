"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Folder, FolderPlus, Plus, Trash2, Upload, Users } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useBrowserActions } from "./browser-actions-context";
import { usePortal } from "./portal-context";

interface Usage {
  usedBytes: number;
  limitBytes: number | null;
}

export function PortalSidebar() {
  const { organization } = usePortal();
  const pathname = usePathname();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const browserActions = useBrowserActions();

  useEffect(() => {
    api
      .get<Usage>("/organizations/usage")
      .then(setUsage)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!newMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setNewMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [newMenuOpen]);

  const percentUsed =
    usage?.limitBytes ? Math.min(100, (usage.usedBytes / usage.limitBytes) * 100) : null;

  return (
    <aside className="border-border-subtle bg-surface-muted-2 flex h-full w-[264px] shrink-0 flex-col overflow-y-auto border-r px-4 py-6">
      <div className="border-border-subtle bg-background rounded-xl border px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold">
            {organization.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-foreground truncate text-[13px] font-semibold">
              {organization.name}
            </div>
          </div>
        </div>
      </div>

      {browserActions && (
        <div ref={newMenuRef} className="relative mt-4">
          <button
            type="button"
            onClick={() => setNewMenuOpen((v) => !v)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-[0_4px_12px_-4px_oklch(0.55_0.18_255_/_0.5)]"
          >
            <Plus className="h-4 w-4" />
            New
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", newMenuOpen && "rotate-180")} />
          </button>
          {newMenuOpen && (
            <div className="border-border-subtle bg-background absolute top-[calc(100%+6px)] left-0 z-10 w-full overflow-hidden rounded-xl border shadow-lg">
              <button
                type="button"
                onClick={() => {
                  browserActions.startNewFolder();
                  setNewMenuOpen(false);
                }}
                className="text-foreground hover:bg-surface-muted flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium"
              >
                <FolderPlus className="h-4 w-4" />
                New folder
              </button>
              <button
                type="button"
                onClick={() => {
                  browserActions.openUploadPicker();
                  setNewMenuOpen(false);
                }}
                className="text-foreground hover:bg-surface-muted flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium"
              >
                <Upload className="h-4 w-4" />
                Upload file
              </button>
            </div>
          )}
        </div>
      )}

      <nav className="mt-4 flex flex-col gap-0.5">
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
          href="/portal/shared"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold",
            pathname === "/portal/shared"
              ? "bg-accent text-accent-foreground"
              : "text-ink-600 hover:bg-background",
          )}
        >
          <Users className="h-4 w-4" />
          Shared
        </Link>
        <Link
          href="/portal/trash"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold",
            pathname === "/portal/trash"
              ? "bg-accent text-accent-foreground"
              : "text-ink-600 hover:bg-background",
          )}
        >
          <Trash2 className="h-4 w-4" />
          Trash
        </Link>
      </nav>

      <div className="flex-1" />

      <div className="border-border-subtle border-t pt-4">
        {percentUsed !== null && (
          <div className="bg-surface-muted mb-1.5 h-1.5 w-full overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                percentUsed >= 90 ? "bg-error-text" : percentUsed >= 70 ? "bg-warn" : "bg-primary",
              )}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
        )}
        <div className="text-ink-450 mb-3 text-[11px]">
          {usage === null
            ? "—"
            : usage.limitBytes === null
              ? `${formatBytes(usage.usedBytes)} used`
              : `${formatBytes(usage.usedBytes)} of ${formatBytes(usage.limitBytes)} used`}
        </div>
        <Link
          href="/portal/settings?tab=billing"
          className="border-input text-foreground hover:bg-background block w-full cursor-pointer rounded-lg border py-2 text-center text-[13px] font-semibold"
        >
          Get more storage
        </Link>
      </div>
    </aside>
  );
}
