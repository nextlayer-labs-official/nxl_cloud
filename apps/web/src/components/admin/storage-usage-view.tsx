"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { formatBytes } from "@/lib/format";
import type { AdminStorageUsage } from "@/types/admin";
import { DonutChart, type DonutSlice } from "./donut-chart";

/** Same validated categorical palette as the Overview page's donut — kept in one place there'd be a risk of drifting; duplicated here since it's the only other consumer (extracting a shared constant wasn't worth a new file for two call sites). */
const STORAGE_CATEGORY_COLORS = {
  documents: { light: "#2a78d6", dark: "#3987e5" },
  images: { light: "#eb6834", dark: "#d96b3f" },
  videos: { light: "#1baf7a", dark: "#20a877" },
  others: { light: "#4a3aa7", dark: "#7461c9" },
};

export function StorageUsageView() {
  const [data, setData] = useState<AdminStorageUsage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminStorageUsage>("/admin/storage-usage")
      .then(setData)
      .catch(() => setError("Couldn't load storage usage."));
  }, []);

  if (error) return <p className="text-error-text text-sm">{error}</p>;
  if (!data) return <div className="text-ink-450 text-sm">Loading…</div>;

  const total = data.byCategory.documents + data.byCategory.images + data.byCategory.videos + data.byCategory.others;
  const slices: DonutSlice[] = [
    { label: "Documents", value: data.byCategory.documents, color: STORAGE_CATEGORY_COLORS.documents },
    { label: "Images", value: data.byCategory.images, color: STORAGE_CATEGORY_COLORS.images },
    { label: "Videos", value: data.byCategory.videos, color: STORAGE_CATEGORY_COLORS.videos },
    { label: "Others", value: data.byCategory.others, color: STORAGE_CATEGORY_COLORS.others },
  ].filter((s) => s.value > 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-foreground mb-1 text-2xl font-bold tracking-[-0.02em]">Storage & Usage</h1>
        <p className="text-ink-450 text-sm">Where every byte on the platform is actually going.</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="border-border-subtle rounded-xl border p-5 lg:col-span-1">
          <h2 className="text-foreground mb-4 text-[15px] font-semibold">By category</h2>
          {slices.length > 0 ? (
            <DonutChart data={slices} centerLabel={formatBytes(total)} centerSubLabel="Total used" formatValue={formatBytes} />
          ) : (
            <p className="text-ink-450 py-8 text-center text-[13px]">No files stored yet.</p>
          )}
        </div>

        <div className="border-border-subtle rounded-xl border p-5 lg:col-span-2">
          <h2 className="text-foreground mb-4 text-[15px] font-semibold">By organization</h2>
          <div className="divide-border-subtle -mx-1 flex flex-col divide-y">
            {data.organizations.length === 0 ? (
              <p className="text-ink-450 px-1 text-[13px]">No organizations yet.</p>
            ) : (
              data.organizations.map((org) => {
                const percent = org.limitBytes ? Math.min(100, Math.round((org.usedBytes / org.limitBytes) * 100)) : null;
                return (
                  <Link
                    key={org.id}
                    href={`/admin/organizations/${org.id}`}
                    className="hover:bg-surface-muted flex items-center gap-3 rounded-lg px-1 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground truncate text-[13px] font-semibold">{org.name}</div>
                      <div className="bg-surface-muted mt-1.5 h-1.5 w-full overflow-hidden rounded-full">
                        <div
                          className="bg-accent h-full rounded-full"
                          style={{ width: `${percent ?? 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-ink-450 w-40 shrink-0 text-right text-[12px]">
                      {formatBytes(org.usedBytes)} {org.limitBytes ? `/ ${formatBytes(org.limitBytes)}` : "· unlimited"}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
