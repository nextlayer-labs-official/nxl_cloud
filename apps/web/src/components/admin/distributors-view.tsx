"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminDistributor } from "@/types/admin";
import { NewDistributorModal } from "./new-distributor-modal";

function initials(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

export function DistributorsView() {
  const [distributors, setDistributors] = useState<AdminDistributor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  function load() {
    api
      .get<AdminDistributor[]>("/admin/distributors")
      .then(setDistributors)
      .catch(() => setError("Couldn't load distributors."));
  }

  useEffect(load, []);

  async function toggleSuspend(distributor: AdminDistributor) {
    setPendingId(distributor.id);
    try {
      const path = distributor.suspendedAt
        ? `/admin/distributors/${distributor.id}/reactivate`
        : `/admin/distributors/${distributor.id}/suspend`;
      await api.post(path);
      load();
    } finally {
      setPendingId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!distributors) return null;
    const q = query.trim().toLowerCase();
    if (!q) return distributors;
    return distributors.filter(
      (d) => d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q),
    );
  }, [distributors, query]);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-foreground mb-1 text-2xl font-bold tracking-[-0.02em]">Distributors</h1>
          <p className="text-ink-450 text-sm">
            One tier above partners — they onboard and fund their own resellers. {distributors?.length ?? "…"}{" "}
            total.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          Onboard distributor
        </button>
      </div>

      <div className="border-input bg-background mb-5 flex w-full max-w-xs items-center gap-2 rounded-lg border px-3 py-2">
        <Search className="text-ink-400 h-4 w-4 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="text-foreground placeholder:text-ink-450 min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      {error && <p className="text-error-text text-sm">{error}</p>}

      {!filtered ? (
        <div className="text-ink-450 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="border-border-subtle rounded-xl border border-dashed py-16 text-center">
          <p className="text-foreground text-[15px] font-semibold">
            {distributors?.length === 0 ? "No distributors yet" : "No distributors match"}
          </p>
          <p className="text-ink-450 mt-1 text-sm">
            {distributors?.length === 0
              ? "Onboard a distributor to let them run their own set of partners."
              : "Try a different search."}
          </p>
        </div>
      ) : (
        <div className="border-border-subtle overflow-hidden rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-border-subtle bg-surface-muted border-b text-[12px]">
                <th className="text-ink-550 px-4 py-3 font-semibold">Distributor</th>
                <th className="text-ink-550 px-4 py-3 font-semibold">Status</th>
                <th className="text-ink-550 px-4 py-3 font-semibold">Funding</th>
                <th className="text-ink-550 px-4 py-3 font-semibold">Partners</th>
                <th className="text-ink-550 px-4 py-3 font-semibold">Wallet</th>
                <th className="text-ink-550 px-4 py-3 font-semibold">Onboarded</th>
                <th className="text-ink-550 px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((distributor) => (
                <tr
                  key={distributor.id}
                  className="border-border-subtle hover:bg-surface-muted/50 border-b last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/distributors/${distributor.id}`}
                      className="flex items-center gap-2.5"
                    >
                      <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold">
                        {initials(distributor.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-foreground truncate font-semibold hover:underline">
                          {distributor.name}
                        </div>
                        <div className="text-ink-450 truncate text-[12px]">{distributor.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        distributor.suspendedAt
                          ? "bg-error-bg text-error-text"
                          : "bg-success-bg text-success",
                      )}
                    >
                      {distributor.suspendedAt ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td className="text-ink-450 px-4 py-3 text-[13px]">
                    {distributor.creditEnabled ? "Enabled" : "Disabled"}
                  </td>
                  <td className="px-4 py-3">{distributor.partnerCount}</td>
                  <td className="px-4 py-3 font-medium">
                    ₹{(distributor.walletBalanceCents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-[13px]">{formatDate(distributor.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSuspend(distributor)}
                        disabled={pendingId === distributor.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-60",
                          distributor.suspendedAt
                            ? "border-input hover:bg-surface-muted"
                            : "border-error-border text-error-text hover:bg-error-bg",
                        )}
                      >
                        {pendingId === distributor.id && <Loader2 className="h-3 w-3 animate-spin" />}
                        {distributor.suspendedAt ? "Reactivate" : "Suspend"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <NewDistributorModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}
