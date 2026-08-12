"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
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
  creditBalanceCents: number;
}

interface SubscriptionOverrideModalProps {
  organization: SubscriptionOverrideTarget;
  onClose: () => void;
  onSaved: () => void;
}

const labelClass = "text-ink-700 text-[13px] font-semibold";
const inputClass = "border-input bg-background rounded-lg border px-3 py-2 text-sm w-full";

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
  const [creditBalance, setCreditBalance] = useState(
    (organization.creditBalanceCents / 100).toFixed(2),
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
        creditBalanceCents: Math.round(Number(creditBalance || "0") * 100),
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
        className="border-border-subtle bg-background flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border shadow-2xl"
      >
        <div className="border-border-subtle flex shrink-0 items-start justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-foreground text-[17px] font-semibold">Override plan</h2>
            <p className="text-ink-450 text-[13px]">{organization.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-450 hover:bg-surface-muted hover:text-foreground -mr-1.5 -mt-1 cursor-pointer rounded-lg p-1.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Plan</label>
                <select
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  disabled={!plans}
                  className={inputClass}
                >
                  {plans?.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
                  className={inputClass}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Billing cycle</label>
                <select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                  className={inputClass}
                >
                  {BILLING_CYCLE_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c === "MONTHLY" ? "Monthly" : "Annual"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Renews / expires</label>
                <input
                  type="date"
                  value={currentPeriodEnd}
                  onChange={(e) => setCurrentPeriodEnd(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="border-border-subtle border-t pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Discount %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="e.g. 20"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Free until</label>
                  <input
                    type="date"
                    value={freeUntil}
                    onChange={(e) => setFreeUntil(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <p className="text-ink-450 mt-1.5 text-[12px]">
                Discount applies at their next renewal/purchase — never retroactive.
              </p>
            </div>

            <div className="border-border-subtle border-t pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Storage limit (GB)</label>
                  <input
                    type="number"
                    min={0}
                    value={storageLimitGbOverride}
                    onChange={(e) => setStorageLimitGbOverride(e.target.value)}
                    placeholder="Plan default"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Account credit ₹</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={creditBalance}
                    onChange={(e) => setCreditBalance(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <p className="text-ink-450 mt-1.5 text-[12px]">
                Credit is applied automatically to their next charge — set directly, not added on top.
              </p>
            </div>
          </div>
        </div>

        <div className="border-border-subtle shrink-0 border-t px-6 py-4">
          {error && <p className="text-error-text mb-3 text-[13px]">{error}</p>}
          <div className="flex justify-end gap-2">
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
        </div>
      </form>
    </div>
  );
}
