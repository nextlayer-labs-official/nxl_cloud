"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { FormField } from "@/components/common/form-field";
import { api, ApiError } from "@/lib/api-client";
import type { AdminPlan } from "@/types/admin";

interface PlanFormModalProps {
  plan: AdminPlan | null;
  onClose: () => void;
  onSaved: () => void;
}

function centsToDollarsInput(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toString();
}

export function PlanFormModal({ plan, onClose, onSaved }: PlanFormModalProps) {
  const isEdit = plan !== null;
  const [name, setName] = useState(plan?.name ?? "");
  const [priceMonthly, setPriceMonthly] = useState(centsToDollarsInput(plan?.priceMonthlyCents ?? null));
  const [priceYearly, setPriceYearly] = useState(centsToDollarsInput(plan?.priceYearlyCents ?? null));
  const [storageLimitGb, setStorageLimitGb] = useState(
    plan?.storageLimitGb != null ? String(plan.storageLimitGb) : "",
  );
  const [seatLimit, setSeatLimit] = useState(plan?.seatLimit != null ? String(plan.seatLimit) : "");
  const [features, setFeatures] = useState(plan?.features.join("\n") ?? "");
  const [isDefault, setIsDefault] = useState(plan?.isDefault ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const payload = {
      name,
      priceMonthlyCents: priceMonthly.trim() === "" ? null : Math.round(Number(priceMonthly) * 100),
      priceYearlyCents: priceYearly.trim() === "" ? null : Math.round(Number(priceYearly) * 100),
      storageLimitGb: storageLimitGb.trim() === "" ? null : Number.parseInt(storageLimitGb, 10),
      seatLimit: seatLimit.trim() === "" ? null : Number.parseInt(seatLimit, 10),
      features: features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      isDefault,
    };

    try {
      if (isEdit) {
        await api.patch(`/admin/plans/${plan.id}`, payload);
      } else {
        await api.post("/admin/plans", payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save the plan.");
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
        <h2 className="text-foreground mb-5 text-[17px] font-semibold">
          {isEdit ? "Edit plan" : "New plan"}
        </h2>

        <div className="flex flex-col gap-4">
          <FormField id="p-name" label="Name" value={name} onChange={(e) => setName(e.target.value)} required />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="p-monthly"
              label="Monthly price ₹ (blank = Custom)"
              type="number"
              value={priceMonthly}
              onChange={(e) => setPriceMonthly(e.target.value)}
            />
            <FormField
              id="p-yearly"
              label="Yearly price ₹ (blank = Custom)"
              type="number"
              value={priceYearly}
              onChange={(e) => setPriceYearly(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="p-storage"
              label="Storage GB (blank = Unlimited)"
              type="number"
              value={storageLimitGb}
              onChange={(e) => setStorageLimitGb(e.target.value)}
            />
            <FormField
              id="p-seats"
              label="Seat limit (blank = Unlimited)"
              type="number"
              value={seatLimit}
              onChange={(e) => setSeatLimit(e.target.value)}
            />
          </div>

          <FormField
            id="p-features"
            label="Features (one per line)"
            as="textarea"
            rows={4}
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
          />

          <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4"
            />
            Default plan for new signups
          </label>
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
            disabled={saving || !name.trim()}
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
