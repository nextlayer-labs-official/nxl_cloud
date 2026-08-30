import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { DynamicPricingSection } from "@/components/marketing/dynamic-pricing";
import { FaqList } from "@/components/marketing/faq-list";
import { PRICING_FAQS } from "@/constants/pricing";

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
        <DynamicPricingSection />
      </section>

      {/* FAQ */}
      <section className="px-10 py-[120px]">
        <div className="mx-auto max-w-[720px]">
          <h2 className="mb-10 text-center text-[28px] font-bold tracking-[-0.02em]">
            Pricing questions
          </h2>
          <FaqList faqs={PRICING_FAQS} defaultOpenIndex={0} compact />
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[radial-gradient(ellipse_800px_400px_at_50%_0%,oklch(0.93_0.04_255)_0%,transparent_70%)] px-10 py-[100px] text-center">
        <h2 className="mb-4 text-[32px] font-bold tracking-[-0.02em]">Ready to get started?</h2>
        <Link
          href="/register"
          className="bg-primary text-primary-foreground hover:bg-brand-hover mt-4 inline-block rounded-lg px-8 py-4 text-base font-semibold"
        >
          Create your account
        </Link>
      </section>

      <Footer variant="simple" />
    </div>
  );
}
