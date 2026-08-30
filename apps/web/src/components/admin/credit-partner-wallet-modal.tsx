"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { FormField } from "@/components/common/form-field";
import { api, ApiError } from "@/lib/api-client";

interface CreditPartnerWalletModalProps {
  partnerName: string;
  partnerId: string;
  onClose: () => void;
  onCredited: () => void;
}

export function CreditPartnerWalletModal({
  partnerName,
  partnerId,
  onClose,
  onCredited,
}: CreditPartnerWalletModalProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
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
    const amountCents = Math.round(Number.parseFloat(amount) * 100);
    if (!amountCents || amountCents <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/admin/partners/${partnerId}/wallet/credit`, {
        amountCents,
        note: note.trim() || undefined,
      });
      onCredited();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't credit this wallet.");
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
        <h2 className="text-foreground mb-1 text-[17px] font-semibold">Credit wallet</h2>
        <p className="text-ink-450 mb-5 text-[13px]">
          For <span className="font-semibold">{partnerName}</span> — record the payment you collected
          outside the platform (bank transfer, cheque, etc.).
        </p>

        <div className="flex flex-col gap-4">
          <FormField
            id="cw-amount"
            label="Amount (₹)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="5000.00"
            required
          />
          <FormField
            id="cw-note"
            label="Transaction details (optional)"
            as="textarea"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Bank transfer ref #, cheque number, etc."
          />
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
            disabled={saving || !amount}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Credit wallet
          </button>
        </div>
      </form>
    </div>
  );
}
