"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminPartner } from "@/types/admin";
import { NewPartnerModal } from "./new-partner-modal";

function initials(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

export function PartnersView() {
  const [partners, setPartners] = useState<AdminPartner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");

  function load() {
    api
      .get<AdminPartner[]>("/admin/partners")
      .then(setPartners)
      .catch(() => setError("Couldn't load partners."));
  }

  useEffect(load, []);

  async function toggleSuspend(partner: AdminPartner) {
    setPendingId(partner.id);
    try {
      const path = partner.suspendedAt
        ? `/admin/partners/${partner.id}/reactivate`
        : `/admin/partners/${partner.id}/suspend`;
      await api.post(path);
      load();
    } finally {
      setPendingId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!partners) return null;
    const q = query.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q),
    );
  }, [partners, query]);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-foreground mb-1 text-2xl font-bold tracking-[-0.02em]">Partners</h1>
          <p className="text-ink-450 text-sm">
            Resellers who manage billing for their mapped customers — {partners?.length ?? "…"} total.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          Onboard partner
        </button>
      </div>

      <div className="mb-5 border-input bg-background flex w-full max-w-xs items-center gap-2 rounded-lg border px-3 py-2">
        <Search className="text-ink-400 h-4 w-4 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or code…"
          className="text-foreground placeholder:text-ink-450 min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      {error && <p className="text-error-text text-sm">{error}</p>}

      {!filtered ? (
        <div className="text-ink-450 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="border-border-subtle rounded-xl border border-dashed py-16 text-center">
          <p className="text-foreground text-[15px] font-semibold">
            {partners?.length === 0 ? "No partners yet" : "No partners match"}
          </p>
          <p className="text-ink-450 mt-1 text-sm">
            {partners?.length === 0
              ? "Onboard a reseller to let them manage their own customers' plans."
              : "Try a different search."}
          </p>
        </div>
      ) : (
        <div className="border-border-subtle overflow-hidden rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-border-subtle bg-surface-muted border-b text-[12px]">
                <th className="text-ink-550 px-4 py-3 font-semibold">Partner</th>
                <th className="text-ink-550 px-4 py-3 font-semibold">Code</th>
                <th className="text-ink-550 px-4 py-3 font-semibold">Status</th>
                <th className="text-ink-550 px-4 py-3 font-semibold">Customers</th>
                <th className="text-ink-550 px-4 py-3 font-semibold">Wallet</th>
                <th className="text-ink-550 px-4 py-3 font-semibold">Onboarded</th>
                <th className="text-ink-550 px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((partner) => (
                <tr
                  key={partner.id}
                  className="border-border-subtle hover:bg-surface-muted/50 border-b last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link href={`/admin/partners/${partner.id}`} className="flex items-center gap-2.5">
                      <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold">
                        {initials(partner.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-foreground truncate font-semibold hover:underline">
                          {partner.name}
                        </div>
                        <div className="text-ink-450 truncate text-[12px]">{partner.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <code className="bg-surface-muted rounded px-1.5 py-0.5 text-[12px] font-semibold">
                      {partner.code}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        partner.suspendedAt ? "bg-error-bg text-error-text" : "bg-success-bg text-success",
                      )}
                    >
                      {partner.suspendedAt ? "Suspended" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{partner.organizationCount}</td>
                  <td className="px-4 py-3 font-medium">₹{(partner.walletBalanceCents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-[13px]">{formatDate(partner.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSuspend(partner)}
                        disabled={pendingId === partner.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-60",
                          partner.suspendedAt
                            ? "border-input hover:bg-surface-muted"
                            : "border-error-border text-error-text hover:bg-error-bg",
                        )}
                      >
                        {pendingId === partner.id && <Loader2 className="h-3 w-3 animate-spin" />}
                        {partner.suspendedAt ? "Reactivate" : "Suspend"}
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
        <NewPartnerModal
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
