"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Clock, Folder, FolderPlus, Plus, Star, Trash2, Upload, Users } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useBrowserActions } from "./browser-actions-context";
import { NavIcon } from "./nav-icon";
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

  // A folder page's own accessLevel (registered by FileBrowser) decides whether
  // it's really "My Files" or a shared folder someone else owns — otherwise
  // browsing into a shared folder would wrongly light up "My Files".
  const isSharedFolderPage =
    pathname.startsWith("/portal/folder") && browserActions !== null && browserActions.accessLevel !== "OWNER";
  const canEditHere = browserActions !== null && browserActions.accessLevel !== "VIEWER";
  const canUploadHere = canEditHere;

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

      {browserActions && (canEditHere || canUploadHere) && (
        <div ref={newMenuRef} className="relative mt-4">
          <button
            type="button"
            onClick={() => setNewMenuOpen((v) => !v)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-[0_4px_12px_-4px_oklch(0.55_0.18_255_/_0.5)]"
          >
            <Plus className="h-4 w-4" />
            New
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", newMenuOpen && "rotate-180")} />
          </button>
          {newMenuOpen && (
            <div className="border-border-subtle bg-background absolute top-[calc(100%+6px)] left-0 z-10 min-w-[200px] overflow-hidden rounded-xl border shadow-lg">
              {canEditHere && (
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
              )}
              {canUploadHere && (
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
              )}
            </div>
          )}
        </div>
      )}

      <nav className="mt-4 flex flex-col gap-0.5">
        <Link
          href="/portal"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold",
            (pathname === "/portal" || pathname.startsWith("/portal/folder")) && !isSharedFolderPage
              ? "bg-accent text-accent-foreground"
              : "text-ink-600 hover:bg-background",
          )}
        >
          <NavIcon icon={Folder} className="h-4 w-4" />
          My Files
        </Link>
        <Link
          href="/portal/shared"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold",
            pathname === "/portal/shared" || isSharedFolderPage
              ? "bg-accent text-accent-foreground"
              : "text-ink-600 hover:bg-background",
          )}
        >
          <NavIcon icon={Users} className="h-4 w-4" />
          Shared
        </Link>
        <Link
          href="/portal/recent"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold",
            pathname === "/portal/recent"
              ? "bg-accent text-accent-foreground"
              : "text-ink-600 hover:bg-background",
          )}
        >
          <NavIcon icon={Clock} className="h-4 w-4" />
          Recent
        </Link>
        <Link
          href="/portal/starred"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold",
            pathname === "/portal/starred"
              ? "bg-accent text-accent-foreground"
              : "text-ink-600 hover:bg-background",
          )}
        >
          <NavIcon icon={Star} className="h-4 w-4" />
          Starred
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
          <NavIcon icon={Trash2} className="h-4 w-4" />
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
