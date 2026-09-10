"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import type { AdminPartner } from "@/types/admin";

interface AddExistingPartnerModalProps {
  distributorId: string;
  distributorName: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddExistingPartnerModal({
  distributorId,
  distributorName,
  onClose,
  onAdded,
}: AddExistingPartnerModalProps) {
  const [partners, setPartners] = useState<AdminPartner[] | null>(null);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    api
      .get<AdminPartner[]>("/admin/partners")
      .then(setPartners)
      .catch(() => setError("Couldn't load partners."));
  }, []);

  const candidates = useMemo(() => {
    if (!partners) return null;
    const q = query.trim().toLowerCase();
    return partners
      .filter((p) => p.distributor?.id !== distributorId)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q),
      );
  }, [partners, query, distributorId]);

  async function add(partnerId: string) {
    setPendingId(partnerId);
    setError(null);
    try {
      await api.patch(`/admin/partners/${partnerId}/distributor`, { distributorId });
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't move this partner.");
      setPendingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-border-subtle bg-background flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border shadow-2xl"
      >
        <div className="border-border-subtle border-b p-6">
          <h2 className="text-foreground mb-1 text-[17px] font-semibold">Add existing partner</h2>
          <p className="text-ink-450 text-[13px]">
            Move a partner under <span className="font-semibold">{distributorName}</span>. Their wallet
            balance stays; unset per-plan prices start falling back to this distributor&apos;s rate.
          </p>
          <div className="border-input bg-background mt-4 flex items-center gap-2 rounded-lg border px-3 py-2">
            <Search className="text-ink-400 h-4 w-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, or code…"
              className="text-foreground placeholder:text-ink-450 min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {error && <p className="text-error-text px-3 py-2 text-[13px]">{error}</p>}
          {!candidates ? (
            <p className="text-ink-450 px-3 py-4 text-sm">Loading…</p>
          ) : candidates.length === 0 ? (
            <p className="text-ink-450 px-3 py-4 text-sm">No other partners to add.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {candidates.map((p) => (
                <div
                  key={p.id}
                  className="hover:bg-surface-muted/60 flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-[13px]"
                >
                  <div className="min-w-0">
                    <div className="text-foreground truncate font-semibold">{p.name}</div>
                    <div className="text-ink-450 truncate text-[12px]">
                      <code className="bg-surface-muted rounded px-1 py-0.5 text-[11px] font-semibold">
                        {p.code}
                      </code>{" "}
                      · {p.distributor ? `via ${p.distributor.name}` : "Direct"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(p.id)}
                    disabled={pendingId === p.id}
                    className="border-input hover:bg-surface-muted flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-60"
                  >
                    {pendingId === p.id && <Loader2 className="h-3 w-3 animate-spin" />}
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-border-subtle flex justify-end border-t p-4">
          <button
            type="button"
            onClick={onClose}
            className="text-foreground hover:bg-surface-muted cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
