"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, Wallet } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  PartnerChangeRequestSummary,
  PartnerOrganization,
  PartnerPlan,
  PartnerUsageSummary,
  PartnerWallet,
} from "@/types/partner";
import { ChangePlanModal } from "./change-plan-modal";
import { usePartner } from "./partner-context";

function PendingRequestsSection({
  requests,
  onResolved,
}: {
  requests: PartnerChangeRequestSummary[];
  onResolved: () => void;
}) {
  const [actingId, setActingId] = useState<string | null>(null);

  async function resolve(id: string, action: "approve" | "reject") {
    setActingId(id);
    try {
      await api.post(`/partner/change-requests/${id}/${action}`);
      onResolved();
    } finally {
      setActingId(null);
    }
  }

  if (requests.length === 0) return null;

  return (
    <div className="border-warn/30 bg-warn/10 mb-8 rounded-xl border p-5">
      <h2 className="text-foreground mb-1 text-[15px] font-semibold">
        Pending requests ({requests.length})
      </h2>
      <p className="text-ink-450 mb-4 text-[13px]">
        Customers asking to leave your mapping or switch to a different partner — needs your sign-off.
      </p>
      <div className="flex flex-col gap-3">
        {requests.map((r) => (
          <div
            key={r.id}
            className="border-border-subtle bg-background flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-[13px]"
          >
            <div className="min-w-0">
              <div className="text-foreground font-semibold">{r.organization.name}</div>
              <div className="text-ink-450">
                {r.newPartner
                  ? `Wants to switch to ${r.newPartner.name} (${r.newPartner.code})`
                  : "Wants to leave your partner mapping"}
                {" · "}
                {formatDate(r.createdAt)}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => resolve(r.id, "reject")}
                disabled={actingId === r.id}
                className="border-input hover:bg-surface-muted flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold disabled:opacity-60"
              >
                {actingId === r.id && <Loader2 className="h-3 w-3 animate-spin" />}
                Reject
              </button>
              <button
                type="button"
                onClick={() => resolve(r.id, "approve")}
                disabled={actingId === r.id}
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold disabled:opacity-60"
              >
                {actingId === r.id && <Loader2 className="h-3 w-3 animate-spin" />}
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StorageSummaryCard({ summary }: { summary: PartnerUsageSummary | null }) {
  if (!summary) return null;
  const percentUsed =
    summary.totalQuotaBytes > 0 ? Math.min(100, (summary.totalUsedBytes / summary.totalQuotaBytes) * 100) : 0;

  return (
    <div className="border-border-subtle bg-surface-muted-2 mb-6 rounded-xl border p-5">
      <div className="text-ink-450 mb-3 text-[12px] font-semibold tracking-wide uppercase">
        Storage across your customers
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

function StorageCell({ usedBytes, limitBytes }: { usedBytes: number; limitBytes: number | null }) {
  if (limitBytes === null) {
    return (
      <span>
        {formatBytes(usedBytes)} <span className="text-ink-450">/ Unlimited</span>
      </span>
    );
  }
  const percentUsed = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;
  return (
    <div>
      <div>
        {formatBytes(usedBytes)} <span className="text-ink-450">/ {formatBytes(limitBytes)}</span>
      </div>
      <div className="bg-surface-muted mt-1 h-1.5 w-24 overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full",
            percentUsed >= 90 ? "bg-error-text" : percentUsed >= 70 ? "bg-warn" : "bg-primary",
          )}
          style={{ width: `${percentUsed}%` }}
        />
      </div>
    </div>
  );
}

function CustomersTab({
  organizations,
  partnerCode,
  onChangePlan,
}: {
  organizations: PartnerOrganization[];
  partnerCode: string;
  onChangePlan: (org: PartnerOrganization) => void;
}) {
  if (organizations.length === 0) {
    return (
      <div className="border-border-subtle rounded-xl border border-dashed py-16 text-center">
        <Users className="text-ink-400 mx-auto mb-3 h-8 w-8" />
        <p className="text-foreground text-[15px] font-semibold">No customers yet</p>
        <p className="text-ink-450 mt-1 text-sm">
          Share your code — <span className="font-semibold">{partnerCode}</span> — with customers so
          they can map their workspace to you from Settings.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border-subtle overflow-hidden rounded-xl border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-border-subtle bg-surface-muted border-b text-[12px]">
            <th className="text-ink-550 px-4 py-3 font-semibold">Workspace</th>
            <th className="text-ink-550 px-4 py-3 font-semibold">Plan</th>
            <th className="text-ink-550 px-4 py-3 font-semibold">Storage</th>
            <th className="text-ink-550 px-4 py-3 font-semibold">Status</th>
            <th className="text-ink-550 px-4 py-3 font-semibold">Renews</th>
            <th className="text-ink-550 px-4 py-3 font-semibold">Mapped</th>
            <th className="text-ink-550 px-4 py-3 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {organizations.map((org) => (
            <tr key={org.id} className="border-border-subtle hover:bg-surface-muted/50 border-b last:border-0">
              <td className="px-4 py-3">
                <div className="text-foreground font-semibold">{org.name}</div>
                <div className="text-ink-450 text-[12px]">{org.slug}</div>
              </td>
              <td className="px-4 py-3">
                {org.subscription ? org.subscription.plan.name : <span className="text-ink-450">—</span>}
              </td>
              <td className="px-4 py-3 text-[13px]">
                <StorageCell usedBytes={org.storageUsedBytes} limitBytes={org.storageLimitBytes} />
              </td>
              <td className="px-4 py-3">
                {org.subscription ? org.subscription.status : <span className="text-ink-450">—</span>}
              </td>
              <td className="px-4 py-3 text-[13px]">
                {org.subscription?.currentPeriodEnd ? formatDate(org.subscription.currentPeriodEnd) : "—"}
              </td>
              <td className="px-4 py-3 text-[13px]">{formatDate(org.createdAt)}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onChangePlan(org)}
                    className="border-input hover:bg-surface-muted cursor-pointer rounded-lg border px-3 py-1.5 text-[12px] font-semibold"
                  >
                    Change plan
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WalletTab({ wallet }: { wallet: PartnerWallet | null }) {
  if (!wallet) return <div className="text-ink-450 text-sm">Loading…</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border-subtle bg-surface-muted-2 rounded-xl border p-5">
        <div className="text-ink-450 text-[12px] font-semibold tracking-wide uppercase">Wallet balance</div>
        <div className="text-foreground mt-1 text-[26px] font-bold">
          ₹{(wallet.balanceCents / 100).toFixed(2)}
        </div>
        <p className="text-ink-450 mt-1 text-[12px]">
          Prepaid manually by admin — activating or changing a customer&apos;s plan debits this automatically.
        </p>
      </div>

      <div className="border-border-subtle rounded-xl border p-5">
        <h2 className="text-foreground mb-4 text-[15px] font-semibold">Transaction history</h2>
        {wallet.transactions.length === 0 ? (
          <p className="text-ink-450 text-[13px]">No wallet activity yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {wallet.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-[13px]">
                <div>
                  <div className="text-foreground font-medium">
                    {tx.note ??
                      (tx.type === "CREDIT" ? "Wallet top-up" : `${tx.plan?.name ?? "Plan"} for ${tx.organization?.name ?? "customer"}`)}
                  </div>
                  <div className="text-ink-450">
                    {formatDate(tx.createdAt)}
                    {tx.createdBy && ` · added by ${tx.createdBy.name}`}
                  </div>
                </div>
                <div className={cn("font-semibold", tx.type === "CREDIT" ? "text-success" : "text-error-text")}>
                  {tx.type === "CREDIT" ? "+" : "−"}₹{(tx.amountCents / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type DashboardTab = "customers" | "wallet";

export function PartnerDashboardView() {
  const { partner } = usePartner();
  const [organizations, setOrganizations] = useState<PartnerOrganization[] | null>(null);
  const [plans, setPlans] = useState<PartnerPlan[]>([]);
  const [changeRequests, setChangeRequests] = useState<PartnerChangeRequestSummary[]>([]);
  const [wallet, setWallet] = useState<PartnerWallet | null>(null);
  const [usageSummary, setUsageSummary] = useState<PartnerUsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<DashboardTab>("customers");
  const [changingOrg, setChangingOrg] = useState<PartnerOrganization | null>(null);

  function load() {
    Promise.all([
      api.get<PartnerOrganization[]>("/partner/organizations"),
      api.get<PartnerPlan[]>("/partner/plan-pricing"),
      api.get<PartnerChangeRequestSummary[]>("/partner/change-requests"),
      api.get<PartnerWallet>("/partner/wallet"),
      api.get<PartnerUsageSummary>("/partner/usage-summary"),
    ])
      .then(([orgs, plansData, requestsData, walletData, usageData]) => {
        setOrganizations(orgs);
        setPlans(plansData);
        setChangeRequests(requestsData);
        setWallet(walletData);
        setUsageSummary(usageData);
      })
      .catch(() => setError("Couldn't load your customers."));
  }

  useEffect(load, []);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-foreground mb-1 text-2xl font-bold tracking-[-0.02em]">Your customers</h1>
          <p className="text-ink-450 text-sm">
            Every workspace mapped to your code (<span className="font-semibold">{partner.code}</span>) —{" "}
            {organizations?.length ?? "…"} total.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTab("wallet")}
          className="border-border-subtle bg-surface-muted-2 hover:bg-surface-muted flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-2.5"
        >
          <Wallet className="text-ink-450 h-4 w-4" />
          <div className="text-left">
            <div className="text-ink-450 text-[11px] font-semibold tracking-wide uppercase">Wallet</div>
            <div className="text-foreground text-[15px] font-bold leading-tight">
              ₹{((wallet?.balanceCents ?? 0) / 100).toFixed(2)}
            </div>
          </div>
        </button>
      </div>

      {error && <p className="text-error-text text-sm">{error}</p>}

      <PendingRequestsSection requests={changeRequests} onResolved={load} />

      <div className="bg-surface-muted mb-6 inline-flex items-center gap-1 rounded-full p-1">
        <button
          type="button"
          onClick={() => setTab("customers")}
          className={cn(
            "cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition",
            tab === "customers" ? "bg-background text-foreground shadow-sm" : "text-ink-550 hover:text-foreground",
          )}
        >
          Customers
        </button>
        <button
          type="button"
          onClick={() => setTab("wallet")}
          className={cn(
            "cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition",
            tab === "wallet" ? "bg-background text-foreground shadow-sm" : "text-ink-550 hover:text-foreground",
          )}
        >
          Wallet
        </button>
      </div>

      {!organizations ? (
        <div className="text-ink-450 text-sm">Loading…</div>
      ) : tab === "customers" ? (
        <>
          <StorageSummaryCard summary={usageSummary} />
          <CustomersTab organizations={organizations} partnerCode={partner.code} onChangePlan={setChangingOrg} />
        </>
      ) : (
        <WalletTab wallet={wallet} />
      )}

      {changingOrg && (
        <ChangePlanModal
          organization={changingOrg}
          plans={plans}
          onClose={() => setChangingOrg(null)}
          onSaved={() => {
            setChangingOrg(null);
            load();
          }}
        />
      )}
    </div>
  );
}
