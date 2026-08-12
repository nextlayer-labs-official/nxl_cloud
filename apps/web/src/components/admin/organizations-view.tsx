"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminOrganization } from "@/types/admin";
import { NewCustomerModal } from "./new-customer-modal";
import { SubscriptionOverrideModal } from "./subscription-override-modal";

export function OrganizationsView() {
  const [organizations, setOrganizations] = useState<AdminOrganization[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<AdminOrganization | null>(null);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  function load() {
    api
      .get<AdminOrganization[]>("/admin/organizations")
      .then(setOrganizations)
      .catch(() => setError("Couldn't load organizations."));
  }

  useEffect(load, []);

  async function toggleSuspend(org: AdminOrganization) {
    setPendingId(org.id);
    try {
      const path = org.suspendedAt
        ? `/admin/organizations/${org.id}/reactivate`
        : `/admin/organizations/${org.id}/suspend`;
      await api.post(path);
      load();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-foreground mb-1 text-2xl font-bold tracking-[-0.02em]">Organizations</h1>
          <p className="text-ink-450 text-sm">
            Every customer workspace on the platform — {organizations?.length ?? "…"} total.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreatingCustomer(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          New customer
        </button>
      </div>

      {error && <p className="text-error-text text-sm">{error}</p>}

      {!organizations ? (
        <div className="text-ink-450 text-sm">Loading…</div>
      ) : (
        <div className="border-border-subtle overflow-hidden rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-border-subtle bg-surface-muted border-b text-[12px]">
                <th className="text-ink-550 px-4 py-3 font-semibold">Organization</th>
                <th className="text-ink-550 px-4 py-3 font-semibold">Owner</th>
                <th className="text-ink-550 px-4 py-3 font-semibold">Plan</th>
                <th className="text-ink-550 px-4 py-3 font-semibold">Status</th>
                <th className="text-ink-550 px-4 py-3 font-semibold">Members</th>
                <th className="text-ink-550 px-4 py-3 font-semibold">Storage</th>
                <th className="text-ink-550 px-4 py-3 font-semibold">Created</th>
                <th className="text-ink-550 px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id} className="border-border-subtle border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/organizations/${org.id}`}
                      className="text-foreground font-semibold hover:underline"
                    >
                      {org.name}
                    </Link>
                    <div className="text-ink-450 text-[12px]">{org.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    {org.owner ? (
                      <>
                        <div className="text-foreground">{org.owner.name}</div>
                        <div className="text-ink-450 text-[12px]">{org.owner.email}</div>
                      </>
                    ) : (
                      <span className="text-ink-450">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {org.plan ?? <span className="text-ink-450">—</span>}
                    {org.discountPercent ? (
                      <div className="text-success text-[12px] font-medium">
                        {org.discountPercent}% off
                      </div>
                    ) : null}
                    {org.freeUntil && new Date(org.freeUntil) > new Date() && (
                      <div className="text-success text-[12px] font-medium">
                        Comped until {formatDate(org.freeUntil)}
                      </div>
                    )}
                    {org.creditBalanceCents > 0 && (
                      <div className="text-success text-[12px] font-medium">
                        ₹{(org.creditBalanceCents / 100).toFixed(2)} credit
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {org.subscriptionStatus && (
                        <span className="text-ink-600 text-[12px]">{org.subscriptionStatus}</span>
                      )}
                      <span
                        className={cn(
                          "w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          org.suspendedAt
                            ? "bg-error-bg text-error-text"
                            : "bg-success-bg text-success",
                        )}
                      >
                        {org.suspendedAt ? "Suspended" : "Active"}
                      </span>
                      {org.currentPeriodEnd && (
                        <span className="text-ink-450 text-[12px]">
                          {org.subscriptionStatus === "TRIALING" ? "Trial ends" : "Renews"}{" "}
                          {formatDate(org.currentPeriodEnd)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{org.memberCount}</td>
                  <td className="px-4 py-3">
                    {formatBytes(org.storageUsedBytes)}
                    <span className="text-ink-450">
                      {" / "}
                      {(() => {
                        const limitGb = org.storageLimitGbOverride ?? org.planStorageLimitGb;
                        return limitGb === null ? "Unlimited" : `${limitGb} GB`;
                      })()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[13px]">{formatDate(org.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setOverrideTarget(org)}
                        className="border-input hover:bg-surface-muted cursor-pointer rounded-lg border px-3 py-1.5 text-[12px] font-semibold"
                      >
                        Change plan
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSuspend(org)}
                        disabled={pendingId === org.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-60",
                          org.suspendedAt
                            ? "border-input hover:bg-surface-muted"
                            : "border-error-border text-error-text hover:bg-error-bg",
                        )}
                      >
                        {pendingId === org.id && <Loader2 className="h-3 w-3 animate-spin" />}
                        {org.suspendedAt ? "Reactivate" : "Suspend"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {overrideTarget && (
        <SubscriptionOverrideModal
          organization={overrideTarget}
          onClose={() => setOverrideTarget(null)}
          onSaved={() => {
            setOverrideTarget(null);
            load();
          }}
        />
      )}

      {creatingCustomer && (
        <NewCustomerModal
          onClose={() => setCreatingCustomer(false)}
          onCreated={() => {
            setCreatingCustomer(false);
            load();
          }}
        />
      )}
    </div>
  );
}
