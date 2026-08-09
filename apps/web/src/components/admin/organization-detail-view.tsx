"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AdminAuditLogEntry,
  AdminOrganizationDetail,
  AdminTransaction,
} from "@/types/admin";
import { SubscriptionOverrideModal } from "./subscription-override-modal";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function OrganizationDetailView({ orgId }: { orgId: string }) {
  const [org, setOrg] = useState<AdminOrganizationDetail | null>(null);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [auditLog, setAuditLog] = useState<AdminAuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [overriding, setOverriding] = useState(false);

  function load() {
    Promise.all([
      api.get<AdminOrganizationDetail>(`/admin/organizations/${orgId}`),
      api.get<AdminTransaction[]>(`/admin/organizations/${orgId}/transactions`),
      api.get<AdminAuditLogEntry[]>(`/admin/audit-log?organizationId=${orgId}`),
    ])
      .then(([orgData, txData, logData]) => {
        setOrg(orgData);
        setTransactions(txData);
        setAuditLog(logData);
      })
      .catch(() => setError("Couldn't load this organization."));
  }

  useEffect(load, [orgId]);

  async function toggleSuspend() {
    if (!org) return;
    setPending(true);
    try {
      const path = org.suspendedAt
        ? `/admin/organizations/${org.id}/reactivate`
        : `/admin/organizations/${org.id}/suspend`;
      await api.post(path);
      load();
    } finally {
      setPending(false);
    }
  }

  if (error) return <p className="text-error-text text-sm">{error}</p>;
  if (!org) return <div className="text-ink-450 text-sm">Loading…</div>;

  return (
    <div>
      <Link
        href="/admin"
        className="text-ink-450 hover:text-foreground mb-4 flex items-center gap-1.5 text-[13px] font-medium"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Organizations
      </Link>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-foreground mb-1 text-2xl font-bold tracking-[-0.02em]">{org.name}</h1>
          <p className="text-ink-450 text-sm">{org.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[12px] font-semibold",
              org.suspendedAt ? "bg-error-bg text-error-text" : "bg-success-bg text-success",
            )}
          >
            {org.suspendedAt ? "Suspended" : "Active"}
          </span>
          <button
            type="button"
            onClick={toggleSuspend}
            disabled={pending}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold disabled:opacity-60",
              org.suspendedAt
                ? "border-input hover:bg-surface-muted"
                : "border-error-border text-error-text hover:bg-error-bg",
            )}
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {org.suspendedAt ? "Reactivate" : "Suspend"}
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="border-border-subtle rounded-xl border p-4">
          <div className="text-ink-450 text-[12px] font-semibold tracking-wide uppercase">Created</div>
          <div className="text-foreground mt-1 text-[15px] font-semibold">
            {formatDate(org.createdAt)}
          </div>
        </div>
        <div className="border-border-subtle rounded-xl border p-4">
          <div className="text-ink-450 text-[12px] font-semibold tracking-wide uppercase">Members</div>
          <div className="text-foreground mt-1 text-[15px] font-semibold">{org.members.length}</div>
        </div>
        <div className="border-border-subtle rounded-xl border p-4">
          <div className="text-ink-450 text-[12px] font-semibold tracking-wide uppercase">Storage</div>
          <div className="text-foreground mt-1 text-[15px] font-semibold">
            {formatBytes(org.storageUsedBytes)}
            <span className="text-ink-450">
              {" / "}
              {(() => {
                const limitGb = org.subscription?.storageLimitGbOverride ?? org.subscription?.plan.storageLimitGb;
                return limitGb == null ? "Unlimited" : `${limitGb} GB`;
              })()}
            </span>
          </div>
        </div>
      </div>

      <div className="border-border-subtle mb-6 rounded-xl border p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-foreground text-[15px] font-semibold">Subscription</h2>
          <button
            type="button"
            onClick={() => setOverriding(true)}
            className="border-input hover:bg-surface-muted cursor-pointer rounded-lg border px-3 py-1.5 text-[12px] font-semibold"
          >
            Change plan
          </button>
        </div>
        {org.subscription ? (
          <div className="flex flex-col gap-1 text-[13px]">
            <div className="text-foreground font-semibold">
              {org.subscription.plan.name} · {org.subscription.status}
            </div>
            <div className="text-ink-450">
              {org.subscription.billingCycle === "ANNUAL" ? "Annual" : "Monthly"}
              {org.subscription.currentPeriodEnd &&
                ` · ${org.subscription.status === "TRIALING" ? "trial ends" : "renews"} ${formatDate(org.subscription.currentPeriodEnd)}`}
            </div>
            {org.subscription.discountPercent ? (
              <div className="text-success font-medium">{org.subscription.discountPercent}% off</div>
            ) : null}
            {org.subscription.freeUntil && new Date(org.subscription.freeUntil) > new Date() && (
              <div className="text-success font-medium">
                Comped until {formatDate(org.subscription.freeUntil)}
              </div>
            )}
          </div>
        ) : (
          <p className="text-ink-450 text-[13px]">No subscription yet.</p>
        )}
      </div>

      <div className="border-border-subtle mb-6 rounded-xl border p-5">
        <h2 className="text-foreground mb-4 text-[15px] font-semibold">Members</h2>
        <div className="flex flex-col gap-3">
          {org.members.map((member) => (
            <div key={member.id} className="flex items-center justify-between text-[13px]">
              <div>
                <div className="text-foreground font-medium">{member.name}</div>
                <div className="text-ink-450">{member.email}</div>
              </div>
              <div className="text-ink-450">{member.role}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-border-subtle mb-6 rounded-xl border p-5">
        <h2 className="text-foreground mb-4 text-[15px] font-semibold">Transaction history</h2>
        {transactions.length === 0 ? (
          <p className="text-ink-450 text-[13px]">No transactions yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-[13px]">
                <div>
                  <div className="text-foreground font-medium">{tx.plan.name}</div>
                  <div className="text-ink-450">
                    {formatDate(tx.createdAt)} · {tx.billingCycle === "ANNUAL" ? "Annual" : "Monthly"}
                  </div>
                </div>
                <div className="text-foreground font-semibold">
                  ₹{(tx.amountCents / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-border-subtle rounded-xl border p-5">
        <h2 className="text-foreground mb-4 text-[15px] font-semibold">Activity</h2>
        {auditLog.length === 0 ? (
          <p className="text-ink-450 text-[13px]">No activity recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {auditLog.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-[13px]">
                <div>
                  <div className="text-foreground font-medium">
                    {entry.action}
                    {entry.targetType && <span className="text-ink-450"> · {entry.targetType}</span>}
                  </div>
                  <div className="text-ink-450">
                    {entry.actor ? `${entry.actor.name} (${entry.actor.email})` : "system"}
                  </div>
                </div>
                <div className="text-ink-450 shrink-0">{formatDateTime(entry.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {overriding && (
        <SubscriptionOverrideModal
          organization={{
            id: org.id,
            name: org.name,
            plan: org.subscription?.plan.name ?? null,
            subscriptionStatus: org.subscription?.status ?? null,
            billingCycle: org.subscription?.billingCycle ?? null,
            currentPeriodEnd: org.subscription?.currentPeriodEnd ?? null,
            discountPercent: org.subscription?.discountPercent ?? null,
            freeUntil: org.subscription?.freeUntil ?? null,
            storageLimitGbOverride: org.subscription?.storageLimitGbOverride ?? null,
          }}
          onClose={() => setOverriding(false)}
          onSaved={() => {
            setOverriding(false);
            load();
          }}
        />
      )}
    </div>
  );
}
