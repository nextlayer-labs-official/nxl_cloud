"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { PricingCard } from "@/components/marketing/pricing-card";
import type { PricingTierData } from "@/types/marketing";

interface PublicPlan {
  id: string;
  name: string;
  priceMonthlyCents: number | null;
  priceYearlyCents: number | null;
  storageLimitGb: number | null;
  features: string[];
}

function formatPrice(cents: number | null): string {
  if (cents === null) return "Custom";
  return `₹${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/**
 * Real plans from `GET /billing/plans` (unauthenticated) rendered as pricing
 * cards — replaces the old hardcoded "Starter/Business/Enterprise" fiction,
 * which quoted USD and per-seat pricing that never matched what a visitor
 * actually saw after registering. Billing is per-organization, in INR.
 */
export function DynamicPricingSection() {
  const [plans, setPlans] = useState<PublicPlan[] | null>(null);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    api
      .get<PublicPlan[]>("/billing/plans")
      .then(setPlans)
      .catch(() => setPlans([]));
  }, []);

  return (
    <>
      <div className="bg-surface-muted inline-flex items-center gap-3 rounded-full p-1.5">
        <button
          type="button"
          onClick={() => setAnnual(false)}
          className={cn(
            "rounded-full px-5 py-[9px] text-sm font-semibold",
            !annual ? "bg-background text-foreground" : "text-ink-550 bg-transparent",
          )}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setAnnual(true)}
          className={cn(
            "rounded-full px-5 py-[9px] text-sm font-semibold",
            annual ? "bg-background text-foreground" : "text-ink-550 bg-transparent",
          )}
        >
          Annual
        </button>
      </div>

      {!plans ? (
        <div className="mt-10 text-sm">Loading plans…</div>
      ) : plans.length === 0 ? (
        <p className="text-muted-foreground mt-10 text-sm">Couldn&apos;t load plans right now.</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {plans.map((plan): PricingTierData => {
            const cents = annual ? plan.priceYearlyCents : plan.priceMonthlyCents;
            const isCustom = cents === null;
            return {
              name: plan.name,
              price: formatPrice(cents),
              priceNote: isCustom
                ? "Contact us for a quote"
                : `per organization / ${annual ? "year" : "month"}`,
              features: [
                plan.storageLimitGb === null ? "Unlimited storage" : `${plan.storageLimitGb} GB storage`,
                ...plan.features,
              ],
              cta: isCustom ? "Contact sales" : "Get started",
              ctaHref: isCustom ? "/contact" : "/register",
              featured: false,
            };
          }).map((tier) => (
            <PricingCard key={tier.name} tier={tier} />
          ))}
        </div>
      )}
    </>
  );
}
