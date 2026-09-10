"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AdminDistributorDetail,
  AdminDistributorPricingRow,
  AdminDistributorWallet,
} from "@/types/admin";
import { AddExistingPartnerModal } from "./add-existing-partner-modal";
import { CreditDistributorWalletModal } from "./credit-distributor-wallet-modal";

function centsToInput(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toString();
}

function inputToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? null : Math.round(parsed * 100);
}

function PricingRow({
  row,
  distributorId,
  onSaved,
}: {
  row: AdminDistributorPricingRow;
  distributorId: string;
  onSaved: () => void;
}) {
  const [monthly, setMonthly] = useState(centsToInput(row.distributorPriceMonthlyCents));
  const [yearly, setYearly] = useState(centsToInput(row.distributorPriceYearlyCents));
  const [saving, setSaving] = useState(false);

  const dirty =
    monthly !== centsToInput(row.distributorPriceMonthlyCents) ||
    yearly !== centsToInput(row.distributorPriceYearlyCents);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/admin/distributors/${distributorId}/pricing/${row.planId}`, {
        priceMonthlyCents: inputToCents(monthly),
        priceYearlyCents: inputToCents(yearly),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-border-subtle flex items-center justify-between gap-4 border-b px-4 py-3.5 text-[13px] last:border-0">
      <div className="min-w-0">
        <div className="text-foreground font-semibold">{row.planName}</div>
        <div className="text-ink-450 text-[12px]">
          List price:{" "}
          {row.listPriceMonthlyCents === null
            ? "Custom"
            : `₹${(row.listPriceMonthlyCents / 100).toFixed(2)}/mo · ₹${((row.listPriceYearlyCents ?? 0) / 100).toFixed(2)}/yr`}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-ink-450 text-[12px]">₹</span>
          <input
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            placeholder="—"
            className="border-input bg-background w-20 rounded-lg border px-2 py-1.5 text-[12px] outline-none"
          />
          <span className="text-ink-450 text-[12px]">/mo</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-ink-450 text-[12px]">₹</span>
          <input
            value={yearly}
            onChange={(e) => setYearly(e.target.value)}
            placeholder="—"
            className="border-input bg-background w-20 rounded-lg border px-2 py-1.5 text-[12px] outline-none"
          />
          <span className="text-ink-450 text-[12px]">/yr</span>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="border-input hover:bg-surface-muted flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-60"
        >
          {saving && <Loader2 className="h-3 w-3 animate-spin" />}
          Save
        </button>
      </div>
    </div>
  );
}

type DetailTab = "partners" | "pricing" | "wallet";

export function DistributorDetailView({ distributorId }: { distributorId: string }) {
  const [distributor, setDistributor] = useState<AdminDistributorDetail | null>(null);
  const [pricing, setPricing] = useState<AdminDistributorPricingRow[] | null>(null);
  const [wallet, setWallet] = useState<AdminDistributorWallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [tab, setTab] = useState<DetailTab>("partners");
  const [crediting, setCrediting] = useState(false);
  const [addingPartner, setAddingPartner] = useState(false);

  function load() {
    Promise.all([
      api.get<AdminDistributorDetail>(`/admin/distributors/${distributorId}`),
      api.get<AdminDistributorPricingRow[]>(`/admin/distributors/${distributorId}/pricing`),
      api.get<AdminDistributorWallet>(`/admin/distributors/${distributorId}/wallet`),
    ])
      .then(([distributorData, pricingData, walletData]) => {
        setDistributor(distributorData);
        setPricing(pricingData);
        setWallet(walletData);
      })
      .catch(() => setError("Couldn't load this distributor."));
  }

  useEffect(load, [distributorId]);

  async function toggleSuspend() {
    if (!distributor) return;
    setPending(true);
    try {
      const path = distributor.suspendedAt
        ? `/admin/distributors/${distributor.id}/reactivate`
        : `/admin/distributors/${distributor.id}/suspend`;
      await api.post(path);
      load();
    } finally {
      setPending(false);
    }
  }

  async function toggleCreditEnabled() {
    if (!distributor) return;
    setPending(true);
    try {
      await api.patch(`/admin/distributors/${distributor.id}/credit-enabled`, {
        creditEnabled: !distributor.creditEnabled,
      });
      load();
    } finally {
      setPending(false);
    }
  }

  if (error) return <p className="text-error-text text-sm">{error}</p>;
  if (!distributor) return <div className="text-ink-450 text-sm">Loading…</div>;

  return (
    <div>
      <Link
        href="/admin/distributors"
        className="text-ink-450 hover:text-foreground mb-4 flex items-center gap-1.5 text-[13px] font-medium"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Distributors
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-foreground mb-1 text-2xl font-bold tracking-[-0.02em]">{distributor.name}</h1>
          <p className="text-ink-450 text-sm">{distributor.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[12px] font-semibold",
              distributor.suspendedAt ? "bg-error-bg text-error-text" : "bg-success-bg text-success",
            )}
          >
            {distributor.suspendedAt ? "Suspended" : "Active"}
          </span>
          <button
            type="button"
            onClick={toggleSuspend}
            disabled={pending}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold disabled:opacity-60",
              distributor.suspendedAt
                ? "border-input hover:bg-surface-muted"
                : "border-error-border text-error-text hover:bg-error-bg",
            )}
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {distributor.suspendedAt ? "Reactivate" : "Suspend"}
          </button>
        </div>
      </div>

      <div className="border-border-subtle mb-6 flex items-center justify-between gap-4 rounded-xl border p-4">
        <div>
          <div className="text-foreground text-[14px] font-semibold">
            Negative balance (credit) — {distributor.creditEnabled ? "allowed" : "not allowed"}
          </div>
          <p className="text-ink-450 text-[12px]">
            While allowed, this distributor&apos;s wallet may go below zero — the negative amount is credit
            they owe and must settle. While off, the wallet is strictly prepaid.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleCreditEnabled}
          disabled={pending}
          className={cn(
            "shrink-0 cursor-pointer rounded-lg border px-3.5 py-2 text-sm font-semibold disabled:opacity-60",
            distributor.creditEnabled
              ? "border-error-border text-error-text hover:bg-error-bg"
              : "border-input hover:bg-surface-muted",
          )}
        >
          {distributor.creditEnabled ? "Disallow negative balance" : "Allow negative balance"}
        </button>
      </div>

      <div className="bg-surface-muted mb-6 inline-flex items-center gap-1 rounded-full p-1">
        {(["partners", "pricing", "wallet"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "cursor-pointer rounded-full px-4 py-2 text-sm font-semibold capitalize transition",
              tab === t ? "bg-background text-foreground shadow-sm" : "text-ink-550 hover:text-foreground",
            )}
          >
            {t === "partners"
              ? `Partners (${distributor.partners.length})`
              : t === "wallet"
                ? `Wallet · ₹${((wallet?.balanceCents ?? 0) / 100).toFixed(2)}`
                : "Pricing"}
          </button>
        ))}
      </div>

      {tab === "partners" && (
        <div className="border-border-subtle rounded-xl border p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-foreground text-[15px] font-semibold">
              Partners ({distributor.partners.length})
            </h2>
            <button
              type="button"
              onClick={() => setAddingPartner(true)}
              className="border-input hover:bg-surface-muted flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              Add existing partner
            </button>
          </div>
          {distributor.partners.length === 0 ? (
            <p className="text-ink-450 text-[13px]">This distributor hasn&apos;t onboarded any partners yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {distributor.partners.map((partner) => (
                <Link
                  key={partner.id}
                  href={`/admin/partners/${partner.id}`}
                  className="border-border-subtle hover:bg-surface-muted/50 flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-[13px]"
                >
                  <div className="min-w-0">
                    <div className="text-foreground font-semibold">{partner.name}</div>
                    <div className="text-ink-450">
                      <code className="bg-surface-muted rounded px-1 py-0.5 text-[11px] font-semibold">
                        {partner.code}
                      </code>{" "}
                      · {partner.email}
                    </div>
                  </div>
                  <div className="text-ink-450 shrink-0">{partner.organizationCount} customers</div>
                  <div className="shrink-0 text-right">
                    <div className="text-foreground font-medium">
                      ₹{(partner.walletBalanceCents / 100).toFixed(2)}
                    </div>
                    <div className="text-ink-450">{partner.suspendedAt ? "Suspended" : "Active"}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "pricing" && (
        <div className="border-border-subtle overflow-hidden rounded-xl border">
          <div className="border-border-subtle bg-surface-muted border-b px-4 py-3">
            <p className="text-ink-450 text-[12px]">
              This distributor&apos;s per-plan rate — the fallback its partners&apos; own prices sit on top
              of. Leave a field blank to fall back to the plan&apos;s list price.
            </p>
          </div>
          {!pricing ? (
            <div className="text-ink-450 px-4 py-6 text-sm">Loading…</div>
          ) : (
            pricing.map((row) => (
              <PricingRow key={row.planId} row={row} distributorId={distributorId} onSaved={load} />
            ))
          )}
        </div>
      )}

      {tab === "wallet" && (
        <div className="flex flex-col gap-4">
          <div className="border-border-subtle bg-surface-muted-2 flex items-center justify-between rounded-xl border p-5">
            <div>
              <div className="text-ink-450 text-[12px] font-semibold tracking-wide uppercase">
                Wallet balance
              </div>
              <div className="text-foreground mt-1 text-[22px] font-bold">
                ₹{((wallet?.balanceCents ?? 0) / 100).toFixed(2)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCrediting(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              Credit wallet
            </button>
          </div>

          <div className="border-border-subtle rounded-xl border p-5">
            <h2 className="text-foreground mb-4 text-[15px] font-semibold">Transaction history</h2>
            {!wallet ? (
              <p className="text-ink-450 text-[13px]">Loading…</p>
            ) : wallet.transactions.length === 0 ? (
              <p className="text-ink-450 text-[13px]">No wallet activity yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {wallet.transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-[13px]">
                    <div>
                      <div className="text-foreground font-medium">
                        {tx.note ??
                          (tx.type === "CREDIT"
                            ? "Wallet top-up"
                            : `Funded ${tx.partner?.name ?? "a partner"}`)}
                      </div>
                      <div className="text-ink-450">
                        {formatDate(tx.createdAt)}
                        {tx.type === "DEBIT" && tx.partner && ` · ${tx.partner.name}`}
                        {tx.type === "CREDIT" && tx.createdByAdmin && ` · by ${tx.createdByAdmin.name}`}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "font-semibold",
                        tx.type === "CREDIT" ? "text-success" : "text-error-text",
                      )}
                    >
                      {tx.type === "CREDIT" ? "+" : "−"}₹{(tx.amountCents / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {crediting && (
        <CreditDistributorWalletModal
          distributorId={distributorId}
          distributorName={distributor.name}
          onClose={() => setCrediting(false)}
          onCredited={() => {
            setCrediting(false);
            load();
          }}
        />
      )}

      {addingPartner && (
        <AddExistingPartnerModal
          distributorId={distributorId}
          distributorName={distributor.name}
          onClose={() => setAddingPartner(false)}
          onAdded={load}
        />
      )}
    </div>
  );
}
