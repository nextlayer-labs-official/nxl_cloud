"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { api, ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { AdminPlatformSettings } from "@/types/admin";

export function SettingsView() {
  const [settings, setSettings] = useState<AdminPlatformSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<AdminPlatformSettings>("/admin/settings")
      .then(setSettings)
      .catch(() => setError("Couldn't load settings."));
  }, []);

  async function handleToggle(paymentsEnabled: boolean) {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.patch<AdminPlatformSettings>("/admin/settings", { paymentsEnabled });
      setSettings(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-foreground mb-1 text-2xl font-bold tracking-[-0.02em]">Settings</h1>
        <p className="text-ink-450 text-sm">Platform-wide toggles.</p>
      </div>

      {error && <p className="text-error-text mb-4 text-sm">{error}</p>}

      {!settings ? (
        <div className="text-ink-450 text-sm">Loading…</div>
      ) : (
        <div className="border-border-subtle flex items-start justify-between gap-6 rounded-xl border p-5">
          <div>
            <div className="text-foreground text-[14px] font-semibold">Payments (Razorpay)</div>
            <p className="text-ink-450 mt-1 max-w-md text-[13px]">
              While off, customer self-serve checkout for paid plans is blocked with a clear message instead of
              reaching Razorpay. Partner wallet-debit plan changes and your own manual plan overrides aren&apos;t
              affected — neither of those ever charges a card.
            </p>
            {settings.updatedAt && (
              <p className="text-ink-450 mt-2 text-[12px]">
                Last changed {formatDate(settings.updatedAt)}
                {settings.updatedByName && ` · by ${settings.updatedByName}`}
              </p>
            )}
          </div>
          <Switch
            checked={settings.paymentsEnabled}
            disabled={saving}
            onCheckedChange={handleToggle}
            aria-label="Payments enabled"
          />
        </div>
      )}
    </div>
  );
}
