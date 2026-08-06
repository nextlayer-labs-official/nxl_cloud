import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PricingTierData } from "@/types/marketing";

export function PricingCard({ tier }: { tier: PricingTierData }) {
  return (
    <div
      className={cn(
        "bg-background relative rounded-2xl border p-8",
        tier.featured
          ? "border-primary shadow-[0_20px_50px_-16px_oklch(0.55_0.18_255_/_0.3)]"
          : "border-border shadow-none",
      )}
    >
      {tier.featured && (
        <div className="bg-primary text-primary-foreground absolute -top-3 left-8 rounded-full px-3 py-1 text-xs font-semibold">
          Most popular
        </div>
      )}
      <div className="mb-2 text-lg font-semibold">{tier.name}</div>
      <div
        className={cn("text-4xl font-bold tracking-[-0.02em]", tier.priceNote ? "mb-1" : "mb-5")}
      >
        {tier.price}
      </div>
      {tier.priceNote && <div className="text-ink-450 mb-5 text-[13px]">{tier.priceNote}</div>}
      <div className="text-muted-foreground mb-7 flex flex-col gap-2.5 text-sm">
        {tier.features.map((feature) => (
          <div key={feature}>{feature}</div>
        ))}
      </div>
      <Link
        href={tier.ctaHref}
        className={cn(
          "block rounded-lg p-3 text-center text-[15px] font-semibold",
          tier.featured
            ? "bg-primary text-primary-foreground"
            : "border-input text-foreground border bg-transparent",
        )}
      >
        {tier.cta}
      </Link>
    </div>
  );
}
