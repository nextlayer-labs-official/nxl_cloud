"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DistributorWallet } from "@/types/distributor";

export function DistributorWalletView() {
  const [wallet, setWallet] = useState<DistributorWallet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DistributorWallet>("/distributor/wallet")
      .then(setWallet)
      .catch(() => setError("Couldn't load your wallet."));
  }, []);

  if (error) return <p className="text-error-text text-sm">{error}</p>;
  if (!wallet) return <div className="text-ink-450 text-sm">Loading…</div>;

  return (
    <div>
      <h1 className="text-foreground mb-1 text-2xl font-bold tracking-[-0.02em]">Wallet</h1>
      <p className="text-ink-450 mb-6 text-sm">Prepaid by the platform admin.</p>

      <div className="border-border-subtle bg-surface-muted-2 mb-6 flex items-center justify-between rounded-xl border p-5">
        <div>
          <div className="text-ink-450 text-[12px] font-semibold tracking-wide uppercase">Balance</div>
          <div className="text-foreground mt-1 text-[26px] font-bold">
            ₹{(wallet.balanceCents / 100).toFixed(2)}
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[12px] font-semibold",
            wallet.creditEnabled ? "bg-success-bg text-success" : "bg-error-bg text-error-text",
          )}
        >
          {wallet.creditEnabled ? "Negative balance allowed" : "Prepaid only"}
        </span>
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
                      (tx.type === "CREDIT"
                        ? "Top-up from admin"
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
  );
}
