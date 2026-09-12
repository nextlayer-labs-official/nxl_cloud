"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { AdminUserList } from "@/types/admin";

function initials(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

/** No standalone user detail/edit page — a user's real detail (role, verification actions) already lives in their org's own member list; each row here just links there. */
export function UsersView() {
  const [data, setData] = useState<AdminUserList | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      api
        .get<AdminUserList>(`/admin/users${query ? `?search=${encodeURIComponent(query)}` : ""}`)
        .then(setData)
        .catch(() => setError("Couldn't load users."));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-foreground mb-1 text-2xl font-bold tracking-[-0.02em]">Users</h1>
          <p className="text-ink-450 text-sm">Every user across every organization on the platform.</p>
        </div>
      </div>

      <div className="border-border-subtle bg-surface-muted mb-4 flex max-w-sm items-center gap-2 rounded-lg border px-3 py-2">
        <Search className="text-ink-450 h-4 w-4 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          className="text-foreground placeholder:text-ink-450 w-full bg-transparent text-[13px] outline-none"
        />
      </div>

      {error && <p className="text-error-text text-sm">{error}</p>}

      {!data ? (
        <div className="text-ink-450 text-sm">Loading…</div>
      ) : data.users.length === 0 ? (
        <div className="border-border-subtle rounded-xl border border-dashed py-16 text-center">
          <p className="text-foreground text-[15px] font-semibold">No users found</p>
        </div>
      ) : (
        <div className="border-border-subtle divide-border-subtle divide-y rounded-xl border">
          {data.users.map((user) => (
            <div key={user.id} className="flex items-center gap-3 px-4 py-3">
              <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold">
                {initials(user.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-foreground truncate text-[13px] font-semibold">{user.name}</div>
                <div className="text-ink-450 truncate text-[12px]">{user.email}</div>
              </div>
              <div className="flex min-w-0 shrink-0 flex-col items-end gap-1">
                {user.organizations.map((org) => (
                  <Link
                    key={org.id}
                    href={`/admin/organizations/${org.id}`}
                    className="text-ink-600 hover:text-foreground text-[12px] font-medium hover:underline"
                  >
                    {org.name} · {org.role}
                  </Link>
                ))}
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  user.emailVerifiedAt ? "bg-success-bg text-success" : "bg-surface-muted text-warn"
                }`}
              >
                {user.emailVerifiedAt ? "Verified" : "Unverified"}
              </span>
              <span className="text-ink-450 w-24 shrink-0 text-right text-[12px]">{formatDate(user.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
