"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import type { AdminPlan } from "@/types/admin";
import { PlanFormModal } from "./plan-form-modal";

function formatPrice(cents: number | null): string {
  return cents === null ? "Custom" : `₹${(cents / 100).toFixed(2)}`;
}

export function PlansView() {
  const [plans, setPlans] = useState<AdminPlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<AdminPlan | null>(null);
  const [creating, setCreating] = useState(false);

  function load() {
    api
      .get<AdminPlan[]>("/admin/plans")
      .then(setPlans)
      .catch(() => setError("Couldn't load plans."));
  }

  useEffect(load, []);

  async function handleDelete(plan: AdminPlan) {
    if (!confirm(`Delete the ${plan.name} plan?`)) return;
    setDeletingId(plan.id);
    setError(null);
    try {
      await api.delete(`/admin/plans/${plan.id}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete the plan.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-foreground mb-1 text-2xl font-bold tracking-[-0.02em]">Plans</h1>
          <p className="text-ink-450 text-sm">Pricing tiers offered on the platform.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          New plan
        </button>
      </div>

      {error && <p className="text-error-text mb-4 text-sm">{error}</p>}

      {!plans ? (
        <div className="text-ink-450 text-sm">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="border-border-subtle flex flex-col rounded-xl border p-5">
              <div className="flex items-center gap-2">
                <div className="text-foreground text-[16px] font-semibold">{plan.name}</div>
                {plan.isDefault && (
                  <span className="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-[11px] font-semibold">
                    Default
                  </span>
                )}
              </div>
              <div className="text-ink-450 mt-0.5 text-[13px]">
                {formatPrice(plan.priceMonthlyCents)}/mo · {formatPrice(plan.priceYearlyCents)}/yr
              </div>
              <div className="text-ink-450 mt-2 text-[13px]">
                {plan.storageLimitGb === null ? "Unlimited storage" : `${plan.storageLimitGb} GB storage`}
              </div>
              <div className="text-ink-450 mt-1 text-[13px]">
                {plan.trialEnabled ? `${plan.trialDays}-day trial` : "No trial — starts active"}
              </div>
              {plan.features.length > 0 && (
                <ul className="text-ink-600 mt-3 flex flex-col gap-1 text-[13px]">
                  {plan.features.map((f, i) => (
                    <li key={i}>· {f}</li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(plan)}
                  className="border-input hover:bg-surface-muted flex-1 cursor-pointer rounded-lg border px-3 py-1.5 text-[12px] font-semibold"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(plan)}
                  disabled={deletingId === plan.id}
                  className="border-error-border text-error-text hover:bg-error-bg flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-60"
                >
                  {deletingId === plan.id && <Loader2 className="h-3 w-3 animate-spin" />}
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editTarget) && (
        <PlanFormModal
          plan={editTarget}
          onClose={() => {
            setCreating(false);
            setEditTarget(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditTarget(null);
            load();
          }}
        />
      )}
    </div>
  );
}
