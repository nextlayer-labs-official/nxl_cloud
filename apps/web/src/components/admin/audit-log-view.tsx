"use client";

import { useEffect, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, File, Folder, Settings, Shield } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { AdminAuditLogEntry, AdminAuditLogList, AdminOrganization } from "@/types/admin";
import { AUDIT_ACTIONS, auditActionCategory, auditActionDetail, humanizeAuditAction } from "./audit-action-labels";

const CATEGORY_ICONS = {
  file: File,
  folder: Folder,
  organization: Building2,
  settings: Settings,
  other: Shield,
} as const;

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const ACTIONS_BY_CATEGORY = AUDIT_ACTIONS.reduce<Record<string, string[]>>((acc, action) => {
  const category = auditActionCategory(action);
  (acc[category] ??= []).push(action);
  return acc;
}, {});

const CATEGORY_LABELS: Record<string, string> = {
  file: "File",
  folder: "Folder",
  organization: "Organization",
  settings: "Settings",
  other: "Other",
};

/** Admin-originated rows have no `actor` (that FK is the customer-portal User model, not AdminUser) — their identity is stashed in `metadata` instead. */
function actorName(entry: AdminAuditLogEntry): string {
  if (entry.actor) return entry.actor.name;
  const adminName = entry.metadata?.adminName;
  return typeof adminName === "string" ? adminName : "System";
}

function actorSubtitle(entry: AdminAuditLogEntry): string | null {
  if (entry.actor) return entry.actor.email;
  const adminEmail = entry.metadata?.adminEmail;
  return typeof adminEmail === "string" ? adminEmail : null;
}

export function AuditLogView() {
  const [result, setResult] = useState<AdminAuditLogList | null>(null);
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminOrganization[]>("/admin/organizations")
      .then(setOrganizations)
      .catch(() => {});
  }, []);

  useEffect(() => setPage(1), [organizationId, action, actor, from, to, pageSize]);

  useEffect(() => {
    setResult(null);
    setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (organizationId) params.set("organizationId", organizationId);
    if (action) params.set("action", action);
    if (actor) params.set("actor", actor);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    api
      .get<AdminAuditLogList>(`/admin/audit-log?${params.toString()}`)
      .then(setResult)
      .catch(() => setError("Couldn't load the audit log."));
  }, [organizationId, action, actor, from, to, page, pageSize]);

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-foreground mb-1 text-2xl font-bold tracking-[-0.02em]">Audit Log</h1>
        <p className="text-ink-450 text-sm">Recent activity across every organization.</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
          className="border-input bg-background text-foreground cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium"
        >
          <option value="">All organizations</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="border-input bg-background text-foreground cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium"
        >
          <option value="">All actions</option>
          {Object.entries(ACTIONS_BY_CATEGORY).map(([category, actions]) => (
            <optgroup key={category} label={CATEGORY_LABELS[category] ?? category}>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {humanizeAuditAction(a)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <input
          type="text"
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          placeholder="Search by actor name or email"
          className="border-input bg-background text-foreground placeholder:text-ink-450 rounded-lg border px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="border-input bg-background text-foreground rounded-lg border px-3 py-2 text-sm"
        />
        <span className="text-ink-450 text-sm">to</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="border-input bg-background text-foreground rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-error-text text-sm">{error}</p>}

      {!result ? (
        <div className="text-ink-450 text-sm">Loading…</div>
      ) : result.entries.length === 0 ? (
        <div className="border-border-subtle rounded-xl border border-dashed py-16 text-center">
          <p className="text-foreground text-[15px] font-semibold">No activity recorded yet</p>
        </div>
      ) : (
        <div className="border-border-subtle rounded-xl border">
          <div className="divide-border-subtle divide-y">
            {result.entries.map((entry) => {
              const Icon = CATEGORY_ICONS[auditActionCategory(entry.action)];
              const detail = auditActionDetail(entry);
              return (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      "bg-surface-muted text-ink-450",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground text-sm font-medium">
                      <span className="font-semibold">{actorName(entry)}</span> {humanizeAuditAction(entry.action)}
                    </div>
                    <div className="text-ink-450 text-[12px]">
                      {entry.organization?.name ?? "Platform-wide"}
                      {actorSubtitle(entry) && ` · ${actorSubtitle(entry)}`}
                      {detail && ` · ${detail}`}
                    </div>
                  </div>
                  <div className="text-ink-450 shrink-0 text-[12px]">
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-border-subtle flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
            <span className="text-ink-450 text-[13px]">
              Showing {(result.page - 1) * result.pageSize + 1} to{" "}
              {Math.min(result.page * result.pageSize, result.total)} of {result.total} events.
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
    </div>
  );
}
