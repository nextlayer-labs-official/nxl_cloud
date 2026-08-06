"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PricingCard } from "@/components/marketing/pricing-card";
import type { RawPricingTier } from "@/types/marketing";

export function PricingTiersSection({ tiers }: { tiers: RawPricingTier[] }) {
  const [annual, setAnnual] = useState(false);

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
            "flex items-center gap-2 rounded-full px-5 py-[9px] text-sm font-semibold",
            annual ? "bg-background text-foreground" : "text-ink-550 bg-transparent",
          )}
        >
          Annual
          <span className="bg-success rounded-full px-2 py-0.5 text-[11px] text-white">
            Save 20%
          </span>
        </button>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-6">
        {tiers.map((tier) => {
          const isCustom = tier.monthly === "Custom";
          const price = isCustom ? "Custom" : annual ? tier.yearly : tier.monthly;
          const priceNote = isCustom
            ? "Contact us for a quote"
            : annual
              ? "per user / month, billed annually"
              : "per user / month";
          return (
            <PricingCard
              key={tier.name}
              tier={{
                name: tier.name,
                price,
                priceNote,
                features: tier.features,
                cta: tier.cta,
                ctaHref: tier.ctaHref,
                featured: tier.featured,
              }}
            />
          );
        })}
      </div>
    </>
  );
}
