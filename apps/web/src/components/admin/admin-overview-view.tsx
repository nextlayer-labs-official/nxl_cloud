"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronRight,
  HardDrive,
  IndianRupee,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { formatBytes, formatDate, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminAuditLogEntry, AdminOrganization, AdminOverview, SubscriptionStatus } from "@/types/admin";
import { auditActionCategory, humanizeAuditAction } from "./audit-action-labels";
import { DonutChart, type DonutSlice } from "./donut-chart";
import { RevenueTrendChart } from "./revenue-trend-chart";

function formatMoney(cents: number): string {
  return `₹${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const RANGE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
] as const;

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
  label: string;
  value: string;
  hint?: string;
  deltaPercent?: number;
  href: string;
}

function StatCard({ icon: Icon, iconClassName, label, value, hint, deltaPercent, href }: StatCardProps) {
  const isUp = deltaPercent !== undefined && deltaPercent >= 0;
  return (
    <Link
      href={href}
      className="border-border-subtle hover:bg-surface-muted group flex flex-col gap-3 rounded-xl border p-5 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", iconClassName)}>
          <Icon className="h-4 w-4" />
        </div>
        <ChevronRight className="text-ink-450 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div>
        <div className="text-ink-450 text-xs font-semibold tracking-wide uppercase">{label}</div>
        <div className="text-foreground mt-1 text-2xl font-bold tracking-[-0.02em]">{value}</div>
        <div className="mt-1 flex items-center gap-1.5">
          {deltaPercent !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[12px] font-semibold",
                isUp ? "text-success" : "text-error-text",
              )}
            >
              {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(deltaPercent)}%
            </span>
          )}
          {hint && <span className="text-ink-450 text-[12px]">{hint}</span>}
        </div>
      </div>
    </Link>
  );
}

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING: "Trialing",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  CANCELED: "Canceled",
};

/** Status colors are reserved tokens (never reused for a generic category series) — reusing the same success/warn/error-text/ink-300 tokens already used elsewhere for these exact statuses. */
const STATUS_DONUT_COLORS: Record<SubscriptionStatus, { light: string; dark: string }> = {
  ACTIVE: { light: "#2f8f47", dark: "#4cc36a" },
  TRIALING: { light: "#a8681c", dark: "#dd9c49" },
  PAST_DUE: { light: "#b8392f", dark: "#e07067" },
  CANCELED: { light: "#9aa39d", dark: "#7c8880" },
};

/** Validated categorical palette (dataviz skill's validate_palette.js, fixed order) — not the status tokens above, since file category is an identity series, not a state. */
const STORAGE_CATEGORY_COLORS = {
  documents: { light: "#2a78d6", dark: "#3987e5" },
  images: { light: "#eb6834", dark: "#d96b3f" },
  videos: { light: "#1baf7a", dark: "#20a877" },
  others: { light: "#4a3aa7", dark: "#7461c9" },
};

function initials(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

const ACTIVITY_ICON_BG: Record<string, string> = {
  file: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  folder: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  organization: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  settings: "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
  other: "bg-surface-muted text-ink-450",
};

export function AdminOverviewView() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [organizations, setOrganizations] = useState<AdminOrganization[] | null>(null);
  const [activity, setActivity] = useState<AdminAuditLogEntry[] | null>(null);
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const to = new Date();
    const from = new Date(to.getTime() - rangeDays * 24 * 60 * 60 * 1000);
    const query = `?from=${from.toISOString()}&to=${to.toISOString()}`;
    Promise.all([
      api.get<AdminOverview>(`/admin/overview${query}`),
      api.get<AdminOrganization[]>("/admin/organizations"),
      api.get<AdminAuditLogEntry[]>("/admin/audit-log?take=6"),
    ])
      .then(([overviewData, orgsData, activityData]) => {
        setOverview(overviewData);
        setOrganizations(orgsData);
        setActivity(activityData);
      })
      .catch(() => setError("Couldn't load the platform overview."));
  }, [rangeDays]);

  if (error) return <p className="text-error-text text-sm">{error}</p>;
  if (!overview || !organizations || !activity) return <div className="text-ink-450 text-sm">Loading…</div>;

  const totalSubs = Object.values(overview.subscriptionsByStatus).reduce((a, b) => a + b, 0);
  const statuses = Object.keys(STATUS_LABELS) as SubscriptionStatus[];
  const newest = organizations.slice(0, 5);

  const statusSlices: DonutSlice[] = statuses
    .filter((s) => overview.subscriptionsByStatus[s] > 0)
    .map((s) => ({ label: STATUS_LABELS[s], value: overview.subscriptionsByStatus[s], color: STATUS_DONUT_COLORS[s] }));

  const storageSlices: DonutSlice[] = [
    { label: "Documents", value: overview.storageByCategory.documents, color: STORAGE_CATEGORY_COLORS.documents },
    { label: "Images", value: overview.storageByCategory.images, color: STORAGE_CATEGORY_COLORS.images },
    { label: "Videos", value: overview.storageByCategory.videos, color: STORAGE_CATEGORY_COLORS.videos },
    { label: "Others", value: overview.storageByCategory.others, color: STORAGE_CATEGORY_COLORS.others },
  ].filter((s) => s.value > 0);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-foreground mb-1 text-2xl font-bold tracking-[-0.02em]">Overview</h1>
          <p className="text-ink-450 text-sm">Top-line numbers across every organization on the platform.</p>
        </div>
        <select
          value={rangeDays}
          onChange={(e) => setRangeDays(Number(e.target.value))}
          className="border-border-subtle bg-background text-foreground cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium"
        >
          {RANGE_PRESETS.map((preset) => (
            <option key={preset.days} value={preset.days}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
          label="Organizations"
          value={String(overview.organizations.total)}
          hint={`${overview.organizations.active} active · ${overview.organizations.suspended} suspended`}
          deltaPercent={overview.deltas.organizations}
          href="/admin/organizations"
        />
        <StatCard
          icon={Users}
          iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
          label="Total Users"
          value={String(overview.totalUsers)}
          hint="Across all organizations"
          deltaPercent={overview.deltas.users}
          href="/admin/users"
        />
        <StatCard
          icon={HardDrive}
          iconClassName="bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400"
          label="Storage Used"
          value={formatBytes(overview.totalStorageUsedBytes)}
          hint="of cloud storage"
          deltaPercent={overview.deltas.storageBytes}
          href="/admin/storage-usage"
        />
        <StatCard
          icon={IndianRupee}
          iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
          label="Monthly Recurring Revenue"
          value={formatMoney(overview.estimatedMrrCents)}
          hint="From active subscriptions"
          deltaPercent={overview.deltas.mrr}
          href="/admin/billing"
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="border-border-subtle rounded-xl border p-5">
          <h2 className="text-foreground mb-1 text-[15px] font-semibold">Revenue Trend</h2>
          <p className="text-ink-450 mb-4 text-[12px]">Monthly recurring revenue (last 6 months)</p>
          <RevenueTrendChart data={overview.revenueTrend} />
        </div>
        <div className="border-border-subtle rounded-xl border p-5">
          <h2 className="text-foreground mb-1 text-[15px] font-semibold">Storage Usage</h2>
          <p className="text-ink-450 mb-4 text-[12px]">Total storage consumed across all organizations</p>
          {storageSlices.length > 0 ? (
            <DonutChart
              data={storageSlices}
              centerLabel={formatBytes(overview.totalStorageUsedBytes)}
              centerSubLabel="Total used"
              formatValue={formatBytes}
            />
          ) : (
            <p className="text-ink-450 py-8 text-center text-[13px]">No files stored yet.</p>
          )}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="border-border-subtle rounded-xl border p-5">
          <h2 className="text-foreground mb-4 text-[15px] font-semibold">Subscriptions by status</h2>
          {statusSlices.length > 0 ? (
            <DonutChart
              data={statusSlices}
              centerLabel={String(totalSubs)}
              centerSubLabel="Total"
              formatValue={(v) => String(v)}
            />
          ) : (
            <p className="text-ink-450 py-8 text-center text-[13px]">No subscriptions yet.</p>
          )}
        </div>

        <div className="border-border-subtle rounded-xl border p-5">
          <h2 className="text-foreground mb-4 text-[15px] font-semibold">Newest organizations</h2>
          <div className="divide-border-subtle -mx-1 flex flex-col divide-y">
            {newest.length === 0 ? (
              <p className="text-ink-450 px-1 text-[13px]">No organizations yet.</p>
            ) : (
              newest.map((org) => (
                <Link
                  key={org.id}
                  href={`/admin/organizations/${org.id}`}
                  className="hover:bg-surface-muted flex items-center gap-3 rounded-lg px-1 py-2.5"
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

        <div className="border-border-subtle rounded-xl border p-5">
          <h2 className="text-foreground mb-4 text-[15px] font-semibold">Recent activity</h2>
          <div className="divide-border-subtle -mx-1 flex flex-col divide-y">
            {activity.length === 0 ? (
              <p className="text-ink-450 px-1 text-[13px]">No activity recorded yet.</p>
            ) : (
              activity.map((entry) => {
                const category = auditActionCategory(entry.action);
                const adminName =
                  (entry.metadata?.adminName as string | undefined) ?? entry.actor?.name ?? "System";
                return (
                  <div key={entry.id} className="flex items-center gap-3 px-1 py-2.5">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold",
                        ACTIVITY_ICON_BG[category],
                      )}
                    >
                      {initials(adminName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground truncate text-[13px] font-medium">
                        <span className="font-semibold">{adminName}</span> {humanizeAuditAction(entry.action)}
                      </div>
                      <div className="text-ink-450 truncate text-[12px]">
                        {entry.organization?.name ?? "Platform-wide"} · {formatRelativeTime(entry.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
