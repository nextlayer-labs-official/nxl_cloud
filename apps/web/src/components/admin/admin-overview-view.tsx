"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, HardDrive, IndianRupee, TrendingUp, UserPlus, Users } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminOrganization, AdminOverview, SubscriptionStatus } from "@/types/admin";

function formatMoney(cents: number): string {
  return `₹${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function Card({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="border-border-subtle rounded-xl border p-5">
      <div className="bg-accent text-accent-foreground mb-3 flex h-9 w-9 items-center justify-center rounded-lg">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-ink-450 text-xs font-semibold tracking-wide uppercase">{label}</div>
      <div className="text-foreground mt-1 text-2xl font-bold tracking-[-0.02em]">{value}</div>
      {hint && <div className="text-ink-450 mt-1 text-[12px]">{hint}</div>}
    </div>
  );
}

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: "Trialing",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  CANCELED: "Canceled",
};

const STATUS_BAR_COLORS: Record<SubscriptionStatus, string> = {
  TRIALING: "bg-warn",
  ACTIVE: "bg-success",
  PAST_DUE: "bg-error-text",
  CANCELED: "bg-ink-300",
};

const STATUS_DOT_COLORS: Record<SubscriptionStatus, string> = {
  TRIALING: "bg-warn",
  ACTIVE: "bg-success",
  PAST_DUE: "bg-error-text",
  CANCELED: "bg-ink-300",
};

function initials(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

export function AdminOverviewView() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [organizations, setOrganizations] = useState<AdminOrganization[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get<AdminOverview>("/admin/overview"), api.get<AdminOrganization[]>("/admin/organizations")])
      .then(([overviewData, orgsData]) => {
        setOverview(overviewData);
        setOrganizations(orgsData);
      })
      .catch(() => setError("Couldn't load the platform overview."));
  }, []);

  if (error) return <p className="text-error-text text-sm">{error}</p>;
  if (!overview || !organizations) return <div className="text-ink-450 text-sm">Loading…</div>;

  const totalSubs = Object.values(overview.subscriptionsByStatus).reduce((a, b) => a + b, 0);
  const statuses = Object.keys(STATUS_LABELS) as SubscriptionStatus[];
  const newest = organizations.slice(0, 5);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-foreground mb-1 text-2xl font-bold tracking-[-0.02em]">Overview</h1>
        <p className="text-ink-450 text-sm">Top-line numbers across every organization on the platform.</p>
      </div>

      <div className="mb-8">
        <h2 className="text-ink-450 mb-3 text-xs font-semibold tracking-wide uppercase">Growth</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card
            icon={Building2}
            label="Organizations"
            value={String(overview.organizations.total)}
            hint={`${overview.organizations.active} active · ${overview.organizations.suspended} suspended`}
          />
          <Card icon={Users} label="Users" value={String(overview.totalUsers)} />
          <Card icon={HardDrive} label="Storage used" value={formatBytes(overview.totalStorageUsedBytes)} />
          <Card
            icon={UserPlus}
            label="New orgs (30d)"
            value={String(overview.signups.last30d)}
            hint={`${overview.signups.last7d} in the last 7 days`}
          />
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-ink-450 mb-3 text-xs font-semibold tracking-wide uppercase">Revenue</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card
            icon={TrendingUp}
            label="Estimated MRR"
            value={formatMoney(overview.estimatedMrrCents)}
            hint="From active subscriptions — not a guaranteed charge"
          />
          <Card
            icon={IndianRupee}
            label="Revenue (30d)"
            value={formatMoney(overview.revenue.last30dCents)}
            hint={`${formatMoney(overview.revenue.allTimeCents)} all-time`}
          />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h2 className="text-ink-450 mb-3 text-xs font-semibold tracking-wide uppercase">
            Subscriptions by status
          </h2>
          <div className="border-border-subtle rounded-xl border p-5">
            {totalSubs > 0 && (
              <div className="bg-surface-muted mb-4 flex h-2 w-full overflow-hidden rounded-full">
                {statuses.map((status) => {
                  const count = overview.subscriptionsByStatus[status] ?? 0;
                  if (count === 0) return null;
                  return (
                    <div
                      key={status}
                      className={STATUS_BAR_COLORS[status]}
                      style={{ width: `${(count / totalSubs) * 100}%` }}
                    />
                  );
                })}
              </div>
            )}
            <div className="flex flex-col gap-2.5">
              {statuses.map((status) => {
                const count = overview.subscriptionsByStatus[status] ?? 0;
                const percent = totalSubs > 0 ? Math.round((count / totalSubs) * 100) : 0;
                return (
                  <div key={status} className="flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT_COLORS[status])} />
                      <span className="text-foreground font-medium">{STATUS_LABELS[status]}</span>
                    </div>
                    <span className="text-ink-450">
                      {count} · {percent}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-ink-450 mb-3 text-xs font-semibold tracking-wide uppercase">
            Newest organizations
          </h2>
          <div className="border-border-subtle divide-border-subtle divide-y rounded-xl border">
            {newest.length === 0 ? (
              <p className="text-ink-450 p-5 text-[13px]">No organizations yet.</p>
            ) : (
              newest.map((org) => (
                <Link
                  key={org.id}
                  href={`/admin/organizations/${org.id}`}
                  className="hover:bg-surface-muted flex items-center gap-3 px-4 py-3"
                >
                  <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold">
                    {initials(org.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground truncate text-[13px] font-semibold">{org.name}</div>
                    <div className="text-ink-450 truncate text-[12px]">
                      {org.plan ?? "No plan"} · {formatDate(org.createdAt)}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      org.suspendedAt ? "bg-error-bg text-error-text" : "bg-success-bg text-success",
                    )}
                  >
                    {org.suspendedAt ? "Suspended" : "Active"}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
