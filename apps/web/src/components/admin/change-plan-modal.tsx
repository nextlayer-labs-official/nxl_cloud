"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { AdminPlan } from "@/types/admin";
import type { SubscriptionOverrideTarget } from "./subscription-override-modal";

interface ChangePlanModalProps {
  organization: SubscriptionOverrideTarget;
  onClose: () => void;
  onSaved: () => void;
}

function formatPrice(cents: number | null, cycle: "MONTHLY" | "ANNUAL"): string {
  if (cents === null) return "Custom";
  return `₹${(cents / 100).toFixed(2)}/${cycle === "ANNUAL" ? "yr" : "mo"}`;
}

/**
 * The simple, rule-following plan change — mid-cycle upgrade applies now,
 * mid-cycle downgrade is refused until renewal (surfaced here as a plain
 * error). For discounts, comps, backdating, or forcing an immediate
 * downgrade, admins use the separate "Advanced override" action instead.
 */
export function ChangePlanModal({ organization, onClose, onSaved }: ChangePlanModalProps) {
  const [plans, setPlans] = useState<AdminPlan[] | null>(null);
  const [planId, setPlanId] = useState("");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">(organization.billingCycle ?? "MONTHLY");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminPlan[]>("/admin/plans")
      .then((fetched) => {
        setPlans(fetched);
        const current = fetched.find((p) => p.name === organization.plan);
        setPlanId(current?.id ?? fetched[0]?.id ?? "");
      })
      .catch(() => setError("Couldn't load plans."));
  }, [organization.plan]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/admin/organizations/${organization.id}/plan`, { planId, billingCycle });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't change this organization's plan.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="border-border-subtle bg-background w-full max-w-md rounded-2xl border p-6 shadow-2xl"
      >
        <h2 className="text-foreground mb-1 text-[17px] font-semibold">Change plan</h2>
        <p className="text-ink-450 mb-5 text-[13px]">
          For <span className="font-semibold">{organization.name}</span> — a mid-cycle upgrade applies
          immediately; a downgrade waits until renewal. Need it sooner or need a discount/comp too? Use
          Advanced override instead.
        </p>

        <div className="mb-4 flex items-center gap-1 rounded-full bg-surface-muted p-1">
          {(["MONTHLY", "ANNUAL"] as const).map((cycle) => (
            <button
              key={cycle}
              type="button"
              onClick={() => setBillingCycle(cycle)}
              className={cn(
                "flex-1 cursor-pointer rounded-full px-4 py-1.5 text-[13px] font-semibold",
                billingCycle === cycle ? "bg-background text-foreground shadow-sm" : "text-ink-550",
              )}
            >
              {cycle === "MONTHLY" ? "Monthly" : "Annual"}
            </button>
          ))}
        </div>

        <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {!plans ? (
            <div className="text-ink-450 text-sm">Loading…</div>
          ) : (
            plans.map((plan) => {
              const price = billingCycle === "ANNUAL" ? plan.priceYearlyCents : plan.priceMonthlyCents;
              return (
                <label
                  key={plan.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-lg border px-3.5 py-3 text-[13px]",
                    planId === plan.id ? "border-primary bg-surface-muted-2" : "border-input",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="plan"
                      checked={planId === plan.id}
                      onChange={() => setPlanId(plan.id)}
                      className="accent-primary"
                    />
                    <div>
                      <div className="text-foreground font-semibold">{plan.name}</div>
                      <div className="text-ink-450">
                        {plan.storageLimitGb === null ? "Unlimited storage" : `${plan.storageLimitGb} GB storage`}
                      </div>
                    </div>
                  </div>
                  <div className="text-foreground font-semibold">{formatPrice(price, billingCycle)}</div>
                </label>
              );
            })
          )}
        </div>

        {error && <p className="text-error-text mt-3 text-[13px]">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-foreground hover:bg-surface-muted cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !planId}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
