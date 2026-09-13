"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Ban,
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  MoreVertical,
  Pause,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { formatBytes, formatCustomerCode, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminOrganization } from "@/types/admin";
import { ChangePlanModal } from "./change-plan-modal";
import { DeleteOrganizationModal } from "./delete-organization-modal";
import { NewCustomerModal } from "./new-customer-modal";
import { StatCard } from "./stat-card";
import { SubscriptionOverrideModal } from "./subscription-override-modal";

type StatusFilter = "all" | "active" | "suspended";
type SortKey = "newest" | "oldest" | "name";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
  { key: "name", label: "Name (A-Z)" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function initials(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

function effectiveLimitGb(org: AdminOrganization): number | null {
  return org.storageLimitGbOverride ?? org.planStorageLimitGb;
}

/**
 * Directional "vs. 30 days ago" badges computed from what's already loaded —
 * there's no historical snapshot of suspension/membership state, so
 * `createdAt` is the only real timestamp signal available: "how many of
 * today's matching orgs already existed 30 days ago" vs. "how many exist
 * now". Same honesty tradeoff as AdminService.getOverview's MRR delta —
 * directionally useful for a stat-card badge, not exact accounting (e.g. an
 * org suspended yesterday but created 2 months ago still counts as
 * "suspended 30 days ago" here, which it wasn't).
 */
function percentChangeVsCutoff(orgs: AdminOrganization[], matches: (org: AdminOrganization) => boolean): number {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
  const currentCount = orgs.filter(matches).length;
  const previousCount = orgs.filter((o) => matches(o) && new Date(o.createdAt) < cutoff).length;
  if (previousCount === 0) return currentCount > 0 ? 100 : 0;
  return Math.round(((currentCount - previousCount) / previousCount) * 100);
}

function downloadCsv(rows: AdminOrganization[]) {
  const header = ["Name", "Code", "Slug", "Owner", "Email", "Plan", "Status", "Members", "Storage used (bytes)", "Created"];
  const lines = rows.map((org) =>
    [
      org.name,
      formatCustomerCode(org.customerNumber),
      org.slug,
      org.owner?.name ?? "",
      org.owner?.email ?? "",
      org.plan ?? "",
      org.suspendedAt ? "Suspended" : "Active",
      String(org.memberCount),
      String(org.storageUsedBytes),
      org.createdAt,
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `organizations-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function OrgActionsMenu({
  org,
  onChangePlan,
  onAdvancedOverride,
  onToggleSuspend,
  onDelete,
  pending,
}: {
  org: AdminOrganization;
  onChangePlan: () => void;
  onAdvancedOverride: () => void;
  onToggleSuspend: () => void;
  onDelete: () => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="text-ink-600 hover:bg-surface-muted flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
      </button>
      {open && (
        <div className="border-border-subtle bg-background absolute right-0 z-20 mt-1 w-48 rounded-xl border py-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onChangePlan();
            }}
            className="text-foreground hover:bg-surface-muted flex w-full cursor-pointer items-center px-3.5 py-2 text-left text-[13px] font-medium"
          >
            Change plan
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onAdvancedOverride();
            }}
            className="text-foreground hover:bg-surface-muted flex w-full cursor-pointer items-center px-3.5 py-2 text-left text-[13px] font-medium"
          >
            Advanced override
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onToggleSuspend();
            }}
            className="text-foreground hover:bg-surface-muted flex w-full cursor-pointer items-center gap-2 px-3.5 py-2 text-left text-[13px] font-medium"
          >
            {org.suspendedAt ? <UserCheck className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {org.suspendedAt ? "Reactivate" : "Suspend"}
          </button>
          <div className="border-border-subtle my-1 border-t" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="text-error-text hover:bg-error-bg flex w-full cursor-pointer items-center gap-2 px-3.5 py-2 text-left text-[13px] font-medium"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function OrganizationsView() {
  const [organizations, setOrganizations] = useState<AdminOrganization[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<AdminOrganization | null>(null);
  const [changingPlanTarget, setChangingPlanTarget] = useState<AdminOrganization | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminOrganization | null>(null);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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

  const plans = useMemo(() => {
    if (!organizations) return [];
    return Array.from(new Set(organizations.map((o) => o.plan).filter((p): p is string => !!p))).sort();
  }, [organizations]);

  const filtered = useMemo(() => {
    if (!organizations) return null;
    const q = query.trim().toLowerCase();
    const rows = organizations.filter((org) => {
      if (statusFilter === "active" && org.suspendedAt) return false;
      if (statusFilter === "suspended" && !org.suspendedAt) return false;
      if (planFilter !== "all" && org.plan !== planFilter) return false;
      if (!q) return true;
      return (
        org.name.toLowerCase().includes(q) ||
        org.slug.toLowerCase().includes(q) ||
        org.owner?.name.toLowerCase().includes(q) ||
        org.owner?.email.toLowerCase().includes(q)
      );
    });
    const sorted = [...rows].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      const delta = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortKey === "oldest" ? delta : -delta;
    });
    return sorted;
  }, [organizations, query, statusFilter, planFilter, sortKey]);

  useEffect(() => setPage(1), [query, statusFilter, planFilter, sortKey, pageSize]);

  const totalPages = filtered ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;
  const pageRows = filtered ? filtered.slice((page - 1) * pageSize, page * pageSize) : null;

  const stats = useMemo(() => {
    if (!organizations) return null;
    const isActive = (o: AdminOrganization) => !o.suspendedAt;
    const isSuspended = (o: AdminOrganization) => !!o.suspendedAt;
    return {
      total: organizations.length,
      active: organizations.filter(isActive).length,
      suspended: organizations.filter(isSuspended).length,
      totalMembers: organizations.reduce((sum, o) => sum + o.memberCount, 0),
      deltas: {
        total: percentChangeVsCutoff(organizations, () => true),
        active: percentChangeVsCutoff(organizations, isActive),
        suspended: percentChangeVsCutoff(organizations, isSuspended),
      },
    };
  }, [organizations]);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
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
          New Organization
        </button>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={Building2}
            iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
            label="Total Organizations"
            value={String(stats.total)}
            hint="from last month"
            deltaPercent={stats.deltas.total}
            href="/admin/organizations"
          />
          <StatCard
            icon={UserCheck}
            iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
            label="Active Organizations"
            value={String(stats.active)}
            hint="from last month"
            deltaPercent={stats.deltas.active}
            href="/admin/organizations"
          />
          <StatCard
            icon={Ban}
            iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
            label="Suspended"
            value={String(stats.suspended)}
            hint="from last month"
            deltaPercent={stats.deltas.suspended}
            href="/admin/organizations"
          />
          <StatCard
            icon={Users}
            iconClassName="bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400"
            label="Total Members"
            value={String(stats.totalMembers)}
            href="/admin/users"
          />
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="border-input bg-background flex w-full max-w-xs items-center gap-2 rounded-lg border px-3 py-2">
          <Search className="text-ink-400 h-4 w-4 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, slug, owner, or email…"
            className="text-foreground placeholder:text-ink-450 min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="border-input bg-background text-foreground cursor-pointer rounded-lg border px-3 py-2 text-[13px] font-medium"
          >
            <option value="all">All Plans</option>
            {plans.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="border-input bg-background text-foreground cursor-pointer rounded-lg border px-3 py-2 text-[13px] font-medium"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="border-input bg-background text-foreground cursor-pointer rounded-lg border px-3 py-2 text-[13px] font-medium"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => filtered && downloadCsv(filtered)}
            disabled={!filtered || filtered.length === 0}
            className="border-input hover:bg-surface-muted flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {error && <p className="text-error-text text-sm">{error}</p>}

      {!pageRows ? (
        <div className="text-ink-450 text-sm">Loading…</div>
      ) : pageRows.length === 0 ? (
        <div className="border-border-subtle rounded-xl border border-dashed py-16 text-center">
          <p className="text-foreground text-[15px] font-semibold">No organizations match</p>
          <p className="text-ink-450 mt-1 text-sm">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="border-border-subtle overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
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
                  <th className="text-ink-550 px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((org) => {
                  const limitGb = effectiveLimitGb(org);
                  const usedGb = org.storageUsedBytes / (1024 * 1024 * 1024);
                  const percent = limitGb ? Math.min(100, Math.round((usedGb / limitGb) * 100)) : 0;
                  return (
                    <tr key={org.id} className="border-border-subtle hover:bg-surface-muted/50 border-b last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/admin/organizations/${org.id}`} className="flex items-center gap-2.5">
                          <div className="bg-primary text-primary-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold">
                            {initials(org.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-foreground truncate font-semibold hover:underline">{org.name}</div>
                            <div className="text-ink-450 truncate text-[12px]">
                              {formatCustomerCode(org.customerNumber)} · {org.slug}
                            </div>
                          </div>
                        </Link>
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
                        {org.partner && (
                          <Link
                            href={`/admin/partners/${org.partner.id}`}
                            className="text-primary hover:underline block w-fit text-[12px] font-medium"
                          >
                            Managed by {org.partner.name}
                          </Link>
                        )}
                        {org.discountPercent ? (
                          <div className="text-success text-[12px] font-medium">{org.discountPercent}% off</div>
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
                              org.suspendedAt ? "bg-error-bg text-error-text" : "bg-success-bg text-success",
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
                        <div className="text-[13px]">
                          {formatBytes(org.storageUsedBytes)}
                          <span className="text-ink-450"> / {limitGb === null ? "Unlimited" : `${limitGb} GB`}</span>
                        </div>
                        {limitGb !== null && (
                          <div className="bg-surface-muted mt-1.5 h-1.5 w-24 overflow-hidden rounded-full">
                            <div className="bg-accent h-full rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px]">{formatDate(org.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/organizations/${org.id}`}
                            className="border-input hover:bg-surface-muted cursor-pointer rounded-lg border px-3 py-1.5 text-[12px] font-semibold"
                          >
                            View
                          </Link>
                          <OrgActionsMenu
                            org={org}
                            pending={pendingId === org.id}
                            onChangePlan={() => setChangingPlanTarget(org)}
                            onAdvancedOverride={() => setOverrideTarget(org)}
                            onToggleSuspend={() => toggleSuspend(org)}
                            onDelete={() => setDeleteTarget(org)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-border-subtle flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
            <span className="text-ink-450 text-[13px]">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered!.length)} of {filtered!.length}{" "}
              organizations.
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-input hover:bg-surface-muted flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="bg-accent text-accent-foreground flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-semibold">
                  {page}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="border-input hover:bg-surface-muted flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border-input bg-background text-foreground cursor-pointer rounded-lg border px-2.5 py-1.5 text-[13px] font-medium"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {changingPlanTarget && (
        <ChangePlanModal
          organization={changingPlanTarget}
          onClose={() => setChangingPlanTarget(null)}
          onSaved={() => {
            setChangingPlanTarget(null);
            load();
          }}
        />
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

      {deleteTarget && (
        <DeleteOrganizationModal
          organization={{ id: deleteTarget.id, name: deleteTarget.name }}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}
