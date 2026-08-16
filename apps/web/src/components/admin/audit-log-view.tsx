"use client";

import { useEffect, useState } from "react";
import { Building2, File, Folder } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { AdminAuditLogEntry, AdminOrganization } from "@/types/admin";
import { auditActionCategory, humanizeAuditAction } from "./audit-action-labels";

const CATEGORY_ICONS = { file: File, folder: Folder, other: Building2 } as const;

export function AuditLogView() {
  const [entries, setEntries] = useState<AdminAuditLogEntry[] | null>(null);
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminOrganization[]>("/admin/organizations")
      .then(setOrganizations)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setEntries(null);
    setError(null);
    const query = organizationId ? `?organizationId=${organizationId}` : "";
    api
      .get<AdminAuditLogEntry[]>(`/admin/audit-log${query}`)
      .then(setEntries)
      .catch(() => setError("Couldn't load the audit log."));
  }, [organizationId]);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-foreground mb-1 text-2xl font-bold tracking-[-0.02em]">Audit Log</h1>
          <p className="text-ink-450 text-sm">Recent activity across every organization.</p>
        </div>
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
      </div>

      {error && <p className="text-error-text text-sm">{error}</p>}

      {!entries ? (
        <div className="text-ink-450 text-sm">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="border-border-subtle rounded-xl border border-dashed py-16 text-center">
          <p className="text-foreground text-[15px] font-semibold">No activity recorded yet</p>
        </div>
      ) : (
        <div className="border-border-subtle divide-border-subtle divide-y rounded-xl border">
          {entries.map((entry) => {
            const Icon = CATEGORY_ICONS[auditActionCategory(entry.action)];
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
                    <span className="font-semibold">{entry.actor?.name ?? "System"}</span>{" "}
                    {humanizeAuditAction(entry.action)}
                  </div>
                  <div className="text-ink-450 text-[12px]">
                    {entry.organization.name}
                    {entry.actor && ` · ${entry.actor.email}`}
                  </div>
                </div>
                <div className="text-ink-450 shrink-0 text-[12px]">
                  {new Date(entry.createdAt).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
