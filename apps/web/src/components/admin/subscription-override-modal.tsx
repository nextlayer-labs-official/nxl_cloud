"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import type { SubscriptionStatus } from "@/types/admin";

interface PlanOption {
  id: string;
  name: string;
}

type BillingCycle = "MONTHLY" | "ANNUAL";

const STATUS_OPTIONS: SubscriptionStatus[] = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"];
const BILLING_CYCLE_OPTIONS: BillingCycle[] = ["MONTHLY", "ANNUAL"];

// Narrow, structural subset — satisfied by both AdminOrganization (list row) and
// a small object derived from AdminOrganizationDetail (org detail page), so this
// modal works from either place without depending on one specific shape.
export interface SubscriptionOverrideTarget {
  id: string;
  name: string;
  plan: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  billingCycle: "MONTHLY" | "ANNUAL" | null;
  currentPeriodEnd: string | null;
  discountPercent: number | null;
  freeUntil: string | null;
  storageLimitGbOverride: number | null;
}

interface SubscriptionOverrideModalProps {
  organization: SubscriptionOverrideTarget;
  onClose: () => void;
  onSaved: () => void;
}

export function SubscriptionOverrideModal({
  organization,
  onClose,
  onSaved,
}: SubscriptionOverrideModalProps) {
  const [plans, setPlans] = useState<PlanOption[] | null>(null);
  const [planId, setPlanId] = useState("");
  const [status, setStatus] = useState<SubscriptionStatus>(
    organization.subscriptionStatus ?? "ACTIVE",
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    organization.billingCycle ?? "MONTHLY",
  );
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(
    organization.currentPeriodEnd ? organization.currentPeriodEnd.slice(0, 10) : "",
  );
  const [discountPercent, setDiscountPercent] = useState(
    organization.discountPercent != null ? String(organization.discountPercent) : "",
  );
  const [freeUntil, setFreeUntil] = useState(
    organization.freeUntil ? organization.freeUntil.slice(0, 10) : "",
  );
  const [storageLimitGbOverride, setStorageLimitGbOverride] = useState(
    organization.storageLimitGbOverride != null ? String(organization.storageLimitGbOverride) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<PlanOption[]>("/billing/plans")
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
      await api.patch(`/admin/organizations/${organization.id}/subscription`, {
        planId,
        status,
        billingCycle,
        currentPeriodEnd: currentPeriodEnd === "" ? null : currentPeriodEnd,
        discountPercent: discountPercent === "" ? null : Number(discountPercent),
        freeUntil: freeUntil === "" ? null : freeUntil,
        storageLimitGbOverride: storageLimitGbOverride === "" ? null : Number(storageLimitGbOverride),
      });
      onSaved();
    } catch {
      setError("Couldn't update the subscription.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="border-border-subtle bg-background w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
      >
        <h2 className="text-foreground mb-1 text-[17px] font-semibold">Override plan</h2>
        <p className="text-ink-450 mb-5 text-[13px]">{organization.name}</p>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-ink-700 text-[13px] font-semibold">Plan</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              disabled={!plans}
              className="border-input bg-background rounded-lg border px-3.5 py-2.5 text-sm"
            >
              {plans?.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-ink-700 text-[13px] font-semibold">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
              className="border-input bg-background rounded-lg border px-3.5 py-2.5 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-ink-700 text-[13px] font-semibold">Billing cycle</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                className="border-input bg-background rounded-lg border px-3.5 py-2.5 text-sm"
              >
                {BILLING_CYCLE_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c === "MONTHLY" ? "Monthly" : "Annual"}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-ink-700 text-[13px] font-semibold">Renews / expires</label>
              <input
                type="date"
                value={currentPeriodEnd}
                onChange={(e) => setCurrentPeriodEnd(e.target.value)}
                className="border-input bg-background rounded-lg border px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-ink-700 text-[13px] font-semibold">Discount % (optional)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              placeholder="e.g. 20"
              className="border-input bg-background rounded-lg border px-3.5 py-2.5 text-sm"
            />
            <p className="text-ink-450 text-[12px]">
              Applies at their next renewal/purchase — never retroactive to what they&apos;ve already paid.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-ink-700 text-[13px] font-semibold">Free until (optional)</label>
            <input
              type="date"
              value={freeUntil}
              onChange={(e) => setFreeUntil(e.target.value)}
              className="border-input bg-background rounded-lg border px-3.5 py-2.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-ink-700 text-[13px] font-semibold">
              Storage limit override in GB (optional)
            </label>
            <input
              type="number"
              min={0}
              value={storageLimitGbOverride}
              onChange={(e) => setStorageLimitGbOverride(e.target.value)}
              placeholder="Blank = use plan's default"
              className="border-input bg-background rounded-lg border px-3.5 py-2.5 text-sm"
            />
          </div>
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
