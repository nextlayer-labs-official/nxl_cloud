"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import type { AdminPaymentList } from "@/types/admin";

function formatMoney(cents: number): string {
  return `₹${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function BillingView() {
  const [data, setData] = useState<AdminPaymentList | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminPaymentList>("/admin/payments")
      .then(setData)
      .catch(() => setError("Couldn't load payments."));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-foreground mb-1 text-2xl font-bold tracking-[-0.02em]">Billing & Invoices</h1>
        <p className="text-ink-450 text-sm">Every captured payment across every organization.</p>
      </div>

      {error && <p className="text-error-text text-sm">{error}</p>}

      {!data ? (
        <div className="text-ink-450 text-sm">Loading…</div>
      ) : data.payments.length === 0 ? (
        <div className="border-border-subtle rounded-xl border border-dashed py-16 text-center">
          <p className="text-foreground text-[15px] font-semibold">No payments yet</p>
        </div>
      ) : (
        <div className="border-border-subtle overflow-hidden rounded-xl border">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-border-subtle bg-surface-muted border-b text-left">
                <th className="text-ink-450 px-4 py-2.5 text-[11px] font-semibold tracking-wide uppercase">Organization</th>
                <th className="text-ink-450 px-4 py-2.5 text-[11px] font-semibold tracking-wide uppercase">Plan</th>
                <th className="text-ink-450 px-4 py-2.5 text-[11px] font-semibold tracking-wide uppercase">Cycle</th>
                <th className="text-ink-450 px-4 py-2.5 text-right text-[11px] font-semibold tracking-wide uppercase">Amount</th>
                <th className="text-ink-450 px-4 py-2.5 text-[11px] font-semibold tracking-wide uppercase">Date</th>
                <th className="text-ink-450 px-4 py-2.5 text-[11px] font-semibold tracking-wide uppercase">Razorpay order</th>
              </tr>
            </thead>
            <tbody className="divide-border-subtle divide-y">
              {data.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/organizations/${payment.organizationId}`}
                      className="text-foreground font-semibold hover:underline"
                    >
                      {payment.organization.name}
                    </Link>
                  </td>
                  <td className="text-ink-600 px-4 py-2.5">{payment.plan.name}</td>
                  <td className="text-ink-600 px-4 py-2.5">{payment.billingCycle === "ANNUAL" ? "Yearly" : "Monthly"}</td>
                  <td className="text-foreground px-4 py-2.5 text-right font-semibold">{formatMoney(payment.amountCents)}</td>
                  <td className="text-ink-450 px-4 py-2.5">{formatDate(payment.createdAt)}</td>
                  <td className="text-ink-450 px-4 py-2.5 font-mono text-[11px]">{payment.razorpayOrderId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
