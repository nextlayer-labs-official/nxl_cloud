"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AdminPartnerDetail,
  AdminPartnerPricingRow,
  AdminPartnerUsageSummary,
  AdminPartnerWallet,
} from "@/types/admin";
import { CreditPartnerWalletModal } from "./credit-partner-wallet-modal";

function centsToInput(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toString();
}

function inputToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? null : Math.round(parsed * 100);
}

function PricingRow({ row, partnerId, onSaved }: { row: AdminPartnerPricingRow; partnerId: string; onSaved: () => void }) {
  const [monthly, setMonthly] = useState(centsToInput(row.partnerPriceMonthlyCents));
  const [yearly, setYearly] = useState(centsToInput(row.partnerPriceYearlyCents));
  const [saving, setSaving] = useState(false);

  const dirty = monthly !== centsToInput(row.partnerPriceMonthlyCents) || yearly !== centsToInput(row.partnerPriceYearlyCents);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/admin/partners/${partnerId}/pricing/${row.planId}`, {
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

function StorageSummaryCard({ summary }: { summary: AdminPartnerUsageSummary | null }) {
  if (!summary) return null;
  const percentUsed =
    summary.totalQuotaBytes > 0 ? Math.min(100, (summary.totalUsedBytes / summary.totalQuotaBytes) * 100) : 0;

  return (
    <div className="border-border-subtle bg-surface-muted-2 mb-4 rounded-xl border p-5">
      <div className="text-ink-450 mb-3 text-[12px] font-semibold tracking-wide uppercase">
        Storage across mapped customers
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-ink-450 text-[12px]">Total allotted</div>
          <div className="text-foreground text-[18px] font-bold">
            {formatBytes(summary.totalQuotaBytes)}
            {summary.unlimitedCount > 0 && (
              <span className="text-ink-450 ml-1 text-[12px] font-normal">
                (+{summary.unlimitedCount} unlimited)
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="text-ink-450 text-[12px]">Total used</div>
          <div className="text-foreground text-[18px] font-bold">{formatBytes(summary.totalUsedBytes)}</div>
        </div>
        <div>
          <div className="text-ink-450 text-[12px]">Free</div>
          <div className="text-success text-[18px] font-bold">{formatBytes(summary.totalFreeBytes)}</div>
        </div>
      </div>
      {summary.totalQuotaBytes > 0 && (
        <div className="bg-surface-muted mt-4 h-2 w-full overflow-hidden rounded-full">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              percentUsed >= 90 ? "bg-error-text" : percentUsed >= 70 ? "bg-warn" : "bg-primary",
            )}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      )}
    </div>
  );
}

type DetailTab = "customers" | "pricing" | "wallet";

export function PartnerDetailView({ partnerId }: { partnerId: string }) {
  const [partner, setPartner] = useState<AdminPartnerDetail | null>(null);
  const [pricing, setPricing] = useState<AdminPartnerPricingRow[] | null>(null);
  const [wallet, setWallet] = useState<AdminPartnerWallet | null>(null);
  const [usageSummary, setUsageSummary] = useState<AdminPartnerUsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [tab, setTab] = useState<DetailTab>("customers");
  const [crediting, setCrediting] = useState(false);

  function load() {
    Promise.all([
      api.get<AdminPartnerDetail>(`/admin/partners/${partnerId}`),
      api.get<AdminPartnerPricingRow[]>(`/admin/partners/${partnerId}/pricing`),
      api.get<AdminPartnerWallet>(`/admin/partners/${partnerId}/wallet`),
      api.get<AdminPartnerUsageSummary>(`/admin/partners/${partnerId}/usage-summary`),
    ])
      .then(([partnerData, pricingData, walletData, usageData]) => {
        setPartner(partnerData);
        setPricing(pricingData);
        setWallet(walletData);
        setUsageSummary(usageData);
      })
      .catch(() => setError("Couldn't load this partner."));
  }

  useEffect(load, [partnerId]);

  async function toggleSuspend() {
    if (!partner) return;
    setPending(true);
    try {
      const path = partner.suspendedAt
        ? `/admin/partners/${partner.id}/reactivate`
        : `/admin/partners/${partner.id}/suspend`;
      await api.post(path);
      load();
    } finally {
      setPending(false);
    }
  }

  if (error) return <p className="text-error-text text-sm">{error}</p>;
  if (!partner) return <div className="text-ink-450 text-sm">Loading…</div>;

  return (
    <div>
      <Link
        href="/admin/partners"
        className="text-ink-450 hover:text-foreground mb-4 flex items-center gap-1.5 text-[13px] font-medium"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Partners
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-foreground mb-1 text-2xl font-bold tracking-[-0.02em]">{partner.name}</h1>
          <p className="text-ink-450 text-sm">
            {partner.email} ·{" "}
            <code className="bg-surface-muted rounded px-1.5 py-0.5 text-[12px] font-semibold">
              {partner.code}
            </code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[12px] font-semibold",
              partner.suspendedAt ? "bg-error-bg text-error-text" : "bg-success-bg text-success",
            )}
          >
            {partner.suspendedAt ? "Suspended" : "Active"}
          </span>
          <button
            type="button"
            onClick={toggleSuspend}
            disabled={pending}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold disabled:opacity-60",
              partner.suspendedAt
                ? "border-input hover:bg-surface-muted"
                : "border-error-border text-error-text hover:bg-error-bg",
            )}
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {partner.suspendedAt ? "Reactivate" : "Suspend"}
          </button>
        </div>
      </div>

      {partner.suspendedAt && (
        <p className="border-error-border bg-error-bg text-error-text mb-6 rounded-lg border p-3.5 text-[13px]">
          This partner is suspended — they can&apos;t log in, and their code no longer maps new customers.
          Existing mappings are untouched.
        </p>
      )}

      <div className="bg-surface-muted mb-6 inline-flex items-center gap-1 rounded-full p-1">
        <button
          type="button"
          onClick={() => setTab("customers")}
          className={cn(
            "cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition",
            tab === "customers" ? "bg-background text-foreground shadow-sm" : "text-ink-550 hover:text-foreground",
          )}
        >
          Customers ({partner.organizations.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("pricing")}
          className={cn(
            "cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition",
            tab === "pricing" ? "bg-background text-foreground shadow-sm" : "text-ink-550 hover:text-foreground",
          )}
        >
          Pricing
        </button>
        <button
          type="button"
          onClick={() => setTab("wallet")}
          className={cn(
            "cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition",
            tab === "wallet" ? "bg-background text-foreground shadow-sm" : "text-ink-550 hover:text-foreground",
          )}
        >
          Wallet · ₹{((wallet?.balanceCents ?? 0) / 100).toFixed(2)}
        </button>
      </div>

      {tab === "customers" && (
        <div>
          <StorageSummaryCard summary={usageSummary} />
          <div className="border-border-subtle rounded-xl border p-5">
            <h2 className="text-foreground mb-4 text-[15px] font-semibold">
              Mapped customers ({partner.organizations.length})
            </h2>
            {partner.organizations.length === 0 ? (
              <p className="text-ink-450 text-[13px]">
                No customer has entered this partner&apos;s code yet.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {partner.organizations.map((org) => (
                  <Link
                    key={org.id}
                    href={`/admin/organizations/${org.id}`}
                    className="border-border-subtle hover:bg-surface-muted/50 flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-[13px]"
                  >
                    <div className="min-w-0">
                      <div className="text-foreground font-semibold">{org.name}</div>
                      <div className="text-ink-450">{org.slug}</div>
                    </div>
                    <div className="text-ink-450 shrink-0">
                      {formatBytes(org.storageUsedBytes)} /{" "}
                      {org.storageLimitBytes === null ? "Unlimited" : formatBytes(org.storageLimitBytes)}
                    </div>
                    <div className="text-right shrink-0">
                      {org.subscription ? (
                        <>
                          <div className="text-foreground font-medium">{org.subscription.plan.name}</div>
                          <div className="text-ink-450">{org.subscription.status}</div>
                        </>
                      ) : (
                        <span className="text-ink-450">No subscription</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "pricing" && (
        <div className="border-border-subtle overflow-hidden rounded-xl border">
          <div className="border-border-subtle bg-surface-muted border-b px-4 py-3">
            <p className="text-ink-450 text-[12px]">
              What this partner actually pays when activating or changing a customer&apos;s plan — debited
              straight from their wallet. Leave a field blank to fall back to the plan&apos;s list price.
            </p>
          </div>
          {!pricing ? (
            <div className="text-ink-450 px-4 py-6 text-sm">Loading…</div>
          ) : (
            pricing.map((row) => (
              <PricingRow key={row.planId} row={row} partnerId={partnerId} onSaved={load} />
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
                            : `${tx.plan?.name ?? "Plan"} for ${tx.organization?.name ?? "customer"}`)}
                      </div>
                      <div className="text-ink-450">
                        {formatDate(tx.createdAt)}
                        {tx.createdBy && ` · by ${tx.createdBy.name}`}
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
        <CreditPartnerWalletModal
          partnerId={partnerId}
          partnerName={partner.name}
          onClose={() => setCrediting(false)}
          onCredited={() => {
            setCrediting(false);
            load();
          }}
        />
      )}
    </div>
  );
}
