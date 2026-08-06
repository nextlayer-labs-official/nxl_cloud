import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FaqList } from "@/components/marketing/faq-list";
import { PricingTiersSection } from "@/components/marketing/pricing-tiers-section";
import { PRICING_TIERS, PRICING_TABLE_ROWS, ADDONS, PRICING_FAQS } from "@/constants/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Pick a plan that fits your team. Upgrade or change anytime.",
};

export default function PricingPage() {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <Header />

      {/* Hero + toggle */}
      <section className="px-10 pt-[88px] pb-10 text-center">
        <h1 className="mb-4 text-[44px] font-bold tracking-[-0.02em]">
          Simple, transparent pricing
        </h1>
        <p className="text-muted-foreground mx-auto mb-8 max-w-[560px] text-lg">
          Pick a plan that fits your team. Upgrade or change anytime.
        </p>
        <PricingTiersSection tiers={PRICING_TIERS} />
      </section>

      {/* Comparison table */}
      <section className="px-10 pb-[120px]">
        <div className="border-border-subtle mx-auto max-w-[1080px] overflow-hidden rounded-2xl border">
          <div className="max-h-[640px] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-background sticky top-0 z-10 shadow-[0_1px_0_oklch(0.9_0.008_260)]">
                  <th scope="col" className="text-ink-700 px-5 py-4 text-left font-semibold">
                    Feature
                  </th>
                  <th scope="col" className="px-5 py-4 text-center font-semibold">
                    Starter
                  </th>
                  <th
                    scope="col"
                    className="text-accent-foreground px-5 py-4 text-center font-semibold"
                  >
                    Business
                  </th>
                  <th scope="col" className="px-5 py-4 text-center font-semibold">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {PRICING_TABLE_ROWS.map((row) =>
                  row.isGroup ? (
                    <tr key={row.label}>
                      <th
                        colSpan={4}
                        scope="colgroup"
                        className="bg-surface-muted-2 text-ink-550 px-5 pt-4 pb-2 text-left text-xs font-semibold tracking-[0.04em] uppercase"
                      >
                        {row.label}
                      </th>
                    </tr>
                  ) : (
                    <tr key={row.label} className="border-t border-[oklch(0.94_0.005_260)]">
                      <th scope="row" className="text-ink-700 px-5 py-3 text-left font-medium">
                        {row.label}
                      </th>
                      <td className="text-muted-foreground px-5 py-3 text-center">{row.starter}</td>
                      <td className="text-ink-700 px-5 py-3 text-center font-medium">
                        {row.business}
                      </td>
                      <td className="text-muted-foreground px-5 py-3 text-center">
                        {row.enterprise}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="px-10 pb-[120px]">
        <div className="mx-auto max-w-[1080px]">
          <h3 className="mb-6 text-xl font-bold">Add-ons</h3>
          <div className="grid grid-cols-2 gap-4">
            {ADDONS.map((addon) => (
              <div
                key={addon.name}
                className="border-border flex items-center justify-between rounded-xl border p-5"
              >
                <div>
                  <div className="text-[15px] font-semibold">{addon.name}</div>
                  <div className="text-ink-550 text-[13px]">{addon.desc}</div>
                </div>
                <div className="text-[15px] font-semibold whitespace-nowrap">{addon.price}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-10 pb-[120px]">
        <div className="mx-auto max-w-[720px]">
          <h2 className="mb-10 text-center text-[28px] font-bold tracking-[-0.02em]">
            Pricing questions
          </h2>
          <FaqList faqs={PRICING_FAQS} defaultOpenIndex={0} compact />
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[radial-gradient(ellipse_800px_400px_at_50%_0%,oklch(0.93_0.04_255)_0%,transparent_70%)] px-10 py-[100px] text-center">
        <h2 className="mb-4 text-[32px] font-bold tracking-[-0.02em]">
          Start your 14-day free trial
        </h2>
        <Link
          href="/register"
          className="bg-primary text-primary-foreground hover:bg-brand-hover mt-4 inline-block rounded-lg px-8 py-4 text-base font-semibold"
        >
          Start free trial
        </Link>
      </section>

      <Footer variant="simple" />
    </div>
  );
}
