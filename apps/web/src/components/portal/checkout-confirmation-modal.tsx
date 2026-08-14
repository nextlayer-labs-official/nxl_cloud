"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Info, Loader2, X } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Plan } from "@/types/portal";

type BillingCycle = "MONTHLY" | "ANNUAL";

interface SwitchPreview {
  kind: "purchase" | "renew" | "upgrade" | "downgrade";
  blocked: boolean;
  blockedReason: string | null;
  planName: string;
  currentPlanName: string | null;
  listPriceCents: number | null;
  discountPercent: number | null;
  unusedOldValueCents: number | null;
  proratedNewCostCents: number | null;
  amountPayableCents: number;
  creditAppliedCents: number;
  daysRemaining: number | null;
  currentPeriodEnd: string | null;
  newPeriodEndPreview: string | null;
  availableOn: string | null;
}

const KIND_TITLE: Record<SwitchPreview["kind"], string> = {
  purchase: "Subscribe",
  renew: "Renew your plan",
  upgrade: "Upgrade your plan",
  downgrade: "Switch plan",
};

function formatMoney(cents: number): string {
  return `₹${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function Row({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 px-4 py-3 text-[13px]", emphasized && "font-semibold")}>
      <span className={cn("min-w-0", emphasized ? "text-foreground" : "text-ink-450")}>{label}</span>
      <span className="text-foreground shrink-0 tabular-nums">{value}</span>
    </div>
  );
}

function PlanPill({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-[13px] font-semibold",
        muted ? "bg-surface-muted text-ink-600" : "bg-primary text-primary-foreground",
      )}
    >
      {label}
    </span>
  );
}

interface CheckoutConfirmationModalProps {
  plan: Plan;
  billingCycle: BillingCycle;
  confirming: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Shows exactly what an upgrade/downgrade/renew will cost, what the target plan includes, and when the next renewal lands, before anything is charged or committed — the numbers come from a read-only quote that shares the exact same math as the real order (see billing.service.ts's getOrderPreview). */
export function CheckoutConfirmationModal({
  plan,
  billingCycle,
  confirming,
  onClose,
  onConfirm,
}: CheckoutConfirmationModalProps) {
  const [preview, setPreview] = useState<SwitchPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPreview(null);
    setError(null);
    api
      .get<SwitchPreview>(`/billing/quote?planId=${plan.id}&billingCycle=${billingCycle}`)
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't load a quote.");
      });
    return () => {
      cancelled = true;
    };
  }, [plan.id, billingCycle]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const canConfirm = !!preview && !preview.blocked && !error;
  const blockedReason = error ?? (preview?.blocked ? preview.blockedReason : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-border-subtle bg-background flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border shadow-2xl"
      >
        <div className="border-border-subtle flex shrink-0 items-center justify-between border-b px-6 py-4">
          <h2 className="text-foreground text-[17px] font-semibold">
            {preview ? KIND_TITLE[preview.kind] : "Review changes"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-450 hover:bg-surface-muted hover:text-foreground -mr-1.5 -mt-1 cursor-pointer rounded-lg p-1.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!preview && !error ? (
            <div className="flex flex-col gap-4">
              <div className="bg-surface-muted h-8 w-full animate-pulse rounded-full" />
              <div className="bg-surface-muted h-32 animate-pulse rounded-xl" />
              <div className="bg-surface-muted h-16 animate-pulse rounded-xl" />
            </div>
          ) : blockedReason ? (
            <div className="bg-surface-muted flex items-start gap-3 rounded-xl p-4">
              <Info className="text-ink-450 mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-ink-700 text-[14px]">{blockedReason}</p>
            </div>
          ) : (
            preview && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-center gap-2.5">
                  {preview.currentPlanName && preview.currentPlanName !== preview.planName && (
                    <>
                      <PlanPill label={preview.currentPlanName} muted />
                      <ArrowRight className="text-ink-400 h-4 w-4 shrink-0" />
                    </>
                  )}
                  <PlanPill label={preview.planName} />
                </div>

                {plan.features.length > 0 && (
                  <div className="border-border-subtle rounded-xl border p-4">
                    <div className="text-ink-450 mb-2.5 text-xs font-semibold tracking-wide uppercase">
                      What&apos;s included
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      <li className="text-ink-600 flex items-start gap-2 text-[13px]">
                        <Check className="text-success mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          {plan.storageLimitGb === null ? "Unlimited storage" : `${plan.storageLimitGb} GB storage`}
                        </span>
                      </li>
                      {plan.features.slice(0, 3).map((feature, i) => (
                        <li key={i} className="text-ink-600 flex items-start gap-2 text-[13px]">
                          <Check className="text-success mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="border-border-subtle divide-border-subtle overflow-hidden rounded-xl border divide-y">
                  {preview.kind === "upgrade" ? (
                    <>
                      <Row
                        label={`${preview.planName}, prorated for ${preview.daysRemaining} remaining day${preview.daysRemaining === 1 ? "" : "s"}`}
                        value={formatMoney(preview.proratedNewCostCents ?? 0)}
                      />
                      <Row
                        label={`Credit for unused time on ${preview.currentPlanName}`}
                        value={`− ${formatMoney(preview.unusedOldValueCents ?? 0)}`}
                      />
                    </>
                  ) : (
                    preview.listPriceCents !== null && (
                      <Row
                        label={`${preview.planName} (${billingCycle === "ANNUAL" ? "yearly" : "monthly"})`}
                        value={formatMoney(preview.listPriceCents)}
                      />
                    )
                  )}
                  {!!preview.discountPercent && (
                    <Row label={`${preview.discountPercent}% discount`} value="Applied" />
                  )}
                  {preview.creditAppliedCents > 0 && (
                    <Row label="Account credit applied" value={`− ${formatMoney(preview.creditAppliedCents)}`} />
                  )}
                  <div className="bg-surface-muted-2">
                    <Row
                      label="Total due now"
                      value={preview.amountPayableCents > 0 ? formatMoney(preview.amountPayableCents) : "No charge"}
                      emphasized
                    />
                  </div>
                </div>

                {preview.newPeriodEndPreview && (
                  <p className="text-ink-450 text-center text-[13px]">
                    Renews {formatDate(preview.newPeriodEndPreview)}.
                  </p>
                )}
              </div>
            )
          )}
        </div>

        <div className="border-border-subtle shrink-0 border-t px-6 py-4">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-foreground hover:bg-surface-muted cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold"
            >
              {canConfirm ? "Cancel" : "Close"}
            </button>
            {canConfirm && (
              <button
                type="button"
                onClick={onConfirm}
                disabled={confirming}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
                {preview!.amountPayableCents > 0
                  ? `Confirm and pay ${formatMoney(preview!.amountPayableCents)}`
                  : "Confirm switch"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
