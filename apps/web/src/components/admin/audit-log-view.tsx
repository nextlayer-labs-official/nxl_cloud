"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { AdminAuditLogEntry } from "@/types/admin";

export function AuditLogView() {
  const [entries, setEntries] = useState<AdminAuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminAuditLogEntry[]>("/admin/audit-log")
      .then(setEntries)
      .catch(() => setError("Couldn't load the audit log."));
  }, []);

  return (
    <div>
      <h1 className="text-foreground mb-1 text-2xl font-bold tracking-[-0.02em]">Audit Log</h1>
      <p className="text-ink-450 mb-8 text-sm">Recent activity across every organization.</p>

      {error && <p className="text-error-text text-sm">{error}</p>}

      {!entries ? (
        <div className="text-ink-450 text-sm">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="text-ink-450 text-sm">No activity recorded yet.</div>
      ) : (
        <div className="border-border-subtle divide-border-subtle divide-y rounded-xl border">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <div className="text-foreground text-sm font-medium">
                  {entry.action}
                  {entry.targetType && (
                    <span className="text-ink-450"> · {entry.targetType}</span>
                  )}
                </div>
                <div className="text-ink-450 text-[12px]">
                  {entry.organization.name}
                  {entry.actor ? ` · ${entry.actor.name} (${entry.actor.email})` : " · system"}
                </div>
              </div>
              <div className="text-ink-450 shrink-0 text-[12px]">
                {new Date(entry.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
