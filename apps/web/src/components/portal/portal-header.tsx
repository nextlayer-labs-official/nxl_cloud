"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { usePortal } from "./portal-context";

export function PortalHeader() {
  const { user, organization } = usePortal();
  const router = useRouter();

  async function handleLogout() {
    await api.post("/auth/logout").catch(() => {});
    router.replace("/login");
  }

  return (
    <header className="border-border-subtle bg-background sticky top-0 z-50 border-b">
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Link href="/portal" className="text-foreground text-[19px] font-bold tracking-[-0.02em]">
            Nextlayer Cloud
          </Link>
          <span className="text-border-strong">/</span>
          <span className="text-ink-700 text-sm font-medium">{organization.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground text-sm">{user.name}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="text-foreground cursor-pointer text-sm font-medium"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
