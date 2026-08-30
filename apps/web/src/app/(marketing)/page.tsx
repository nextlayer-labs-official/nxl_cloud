import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PlaceholderVisual } from "@/components/common/placeholder-visual";
import { FeatureRow } from "@/components/marketing/feature-row";
import { DynamicPricingSection } from "@/components/marketing/dynamic-pricing";
import { FaqList } from "@/components/marketing/faq-list";
import { FEATURE_ROWS, SECURITY_COLUMNS, HOME_FAQS, COMPARISON } from "@/constants/home";

export const metadata: Metadata = {
  description:
    "Store, share, and manage your company's files with enterprise-grade security and controls your IT team will actually approve.",
};

export default function HomePage() {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <Header />

      {/* Hero */}
      <section className="relative bg-[radial-gradient(ellipse_900px_500px_at_75%_20%,oklch(0.93_0.04_255)_0%,transparent_70%)] px-10 pt-[120px] pb-[100px]">
        <div className="mx-auto grid max-w-[1280px] grid-cols-[1.1fr_0.9fr] items-center gap-16">
          <div>
            <h1 className="mb-6 text-[56px] leading-[1.08] font-bold tracking-[-0.02em]">
              Secure cloud storage for modern businesses
            </h1>
            <p className="text-muted-foreground mb-9 max-w-[480px] text-[19px] leading-[1.5]">
              Store, share, and manage your company&apos;s files with enterprise-grade security and
              controls your IT team will actually approve.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/register"
                className="bg-primary text-primary-foreground hover:bg-brand-hover rounded-lg px-7 py-3.5 text-base font-semibold"
              >
                Get started
              </Link>
              <Link
                href="/contact"
                className="border-input text-foreground hover:border-ink-300 rounded-lg border px-7 py-3.5 text-base font-semibold"
              >
                Talk to us
              </Link>
            </div>
          </div>

          <div className="relative h-[420px]">
            <div className="border-border-subtle bg-background absolute top-10 left-0 h-[280px] w-[90%] rounded-2xl border p-6 shadow-[0_24px_60px_-12px_oklch(0.22_0.02_260_/_0.18)]">
              <div className="mb-4 flex gap-2">
                <div className="bg-border-strong h-2.5 w-2.5 rounded-full" />
                <div className="bg-border-strong h-2.5 w-2.5 rounded-full" />
                <div className="bg-border-strong h-2.5 w-2.5 rounded-full" />
              </div>
              <PlaceholderVisual
                label="product UI placeholder"
                className="text-ink-450 h-[180px] rounded-lg bg-[repeating-linear-gradient(135deg,oklch(0.96_0.005_260),oklch(0.96_0.005_260)_10px,oklch(0.98_0.003_260)_10px,oklch(0.98_0.003_260)_20px)]"
              />
            </div>
            <div className="border-border-subtle bg-background absolute right-2.5 bottom-5 w-[220px] rounded-xl border p-4 shadow-[0_16px_40px_-8px_oklch(0.22_0.02_260_/_0.15)]">
              <div className="text-muted-foreground mb-2 text-xs font-semibold">Permissions</div>
              <div className="flex items-center gap-2">
                <div className="bg-accent h-6 w-6 rounded-full" />
                <div className="bg-border h-2 flex-1 rounded" />
              </div>
            </div>
            <div className="border-border-subtle bg-background absolute top-0 right-[30px] flex w-[160px] items-center gap-2 rounded-xl border p-3.5 shadow-[0_12px_30px_-6px_oklch(0.22_0.02_260_/_0.12)]">
              <div className="bg-success h-2 w-2 animate-[pulse-dot_2s_ease-in-out_infinite] rounded-full" />
              <div className="text-muted-foreground text-xs">Encrypted</div>
            </div>
          </div>
        </div>
      </section>

      {/* Product screenshot */}
      <section className="px-10 py-[140px]">
        <div className="mx-auto max-w-[1180px] text-center">
          <div className="text-accent-foreground mb-4 text-[13px] font-semibold tracking-[0.06em] uppercase">
            Your files, organized
          </div>
          <h2 className="mb-14 text-[36px] font-bold tracking-[-0.02em]">
            One place for everything your team creates
          </h2>
          <div className="bg-surface-muted rounded-3xl p-10">
            <div className="border-border-subtle bg-background mx-auto max-w-[1000px] overflow-hidden rounded-2xl border shadow-[0_30px_80px_-20px_oklch(0.22_0.02_260_/_0.15)]">
              <div className="border-border-subtle flex gap-1.5 border-b px-5 py-3.5">
                <div className="bg-border-strong h-2.5 w-2.5 rounded-full" />
                <div className="bg-border-strong h-2.5 w-2.5 rounded-full" />
                <div className="bg-border-strong h-2.5 w-2.5 rounded-full" />
              </div>
              <PlaceholderVisual
                label="full product screenshot placeholder"
                className="text-ink-450 h-[420px] bg-[repeating-linear-gradient(135deg,oklch(0.96_0.005_260),oklch(0.96_0.005_260)_12px,oklch(0.99_0.003_260)_12px,oklch(0.99_0.003_260)_24px)] text-[13px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Feature rows */}
      <section className="px-10 pb-[140px]">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-[120px]">
          {FEATURE_ROWS.map((row) => (
            <FeatureRow key={row.title} row={row} />
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="bg-foreground text-background px-10 py-[120px] text-center">
        <div className="mx-auto max-w-[1180px]">
          <h2 className="mb-16 text-[32px] font-bold tracking-[-0.01em]">
            Built on a secure foundation
          </h2>
          <div className="grid grid-cols-3">
            {SECURITY_COLUMNS.map((col) => (
              <div key={col.title} className="border-l border-[oklch(0.35_0.01_260)] px-8">
                <h4 className="mb-3 text-[19px] font-semibold">{col.title}</h4>
                <p className="text-dark-muted mb-4 text-[15px] leading-[1.6]">{col.body}</p>
                <div className="font-mono text-[13px] text-[oklch(0.6_0.1_255)]">{col.spec}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Collaboration */}
      <section className="px-10 py-[140px]">
        <div className="mx-auto flex max-w-[1180px] items-center gap-16">
          <div className="relative h-[320px] flex-1">
            <div className="border-border-subtle bg-surface-muted flex h-full flex-col justify-center gap-4 rounded-2xl border p-6">
              <div className="flex">
                <div className="border-background bg-avatar-blue h-9 w-9 rounded-full border-2 shadow-[0_0_0_1px_oklch(0.9_0.008_260)]" />
                <div className="border-background bg-avatar-orange -ml-2.5 h-9 w-9 rounded-full border-2 shadow-[0_0_0_1px_oklch(0.9_0.008_260)]" />
                <div className="border-background bg-avatar-green -ml-2.5 h-9 w-9 rounded-full border-2 shadow-[0_0_0_1px_oklch(0.9_0.008_260)]" />
              </div>
              <div className="bg-border h-2.5 w-3/5 rounded-[5px]" />
              <div className="bg-border h-2.5 w-4/5 rounded-[5px]" />
              <div className="flex items-center gap-2">
                <div className="bg-success h-2 w-2 animate-[pulse-dot_2s_ease-in-out_infinite] rounded-full" />
                <div className="text-ink-550 text-xs">Shared with your team</div>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-accent-foreground mb-4 text-[13px] font-semibold tracking-[0.06em] uppercase">
              Collaboration
            </div>
            <h2 className="mb-4 text-[32px] font-bold tracking-[-0.02em]">
              Work together without the version chaos
            </h2>
            <p className="text-muted-foreground text-[17px] leading-[1.6]">
              Shared team spaces and full version history keep everyone aligned — with a complete
              history of who changed what, when.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="px-10 py-[140px] text-center">
        <div className="mx-auto max-w-[1080px]">
          <h2 className="mb-16 text-[32px] font-bold tracking-[-0.02em]">
            Why teams choose Nextlayer Cloud
          </h2>
          <div className="border-border grid grid-cols-2 overflow-hidden rounded-2xl border">
            <div className="bg-surface-muted-2 p-10 text-left">
              <div className="text-ink-450 mb-5 text-[13px] font-semibold">
                GENERIC CLOUD STORAGE
              </div>
              <div className="text-ink-450 flex flex-col gap-3.5 text-[15px]">
                {COMPARISON.generic.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            </div>
            <div className="bg-accent p-10 text-left">
              <div className="text-accent-foreground mb-5 text-[13px] font-semibold">
                NEXTLAYER CLOUD
              </div>
              <div className="text-foreground flex flex-col gap-3.5 text-[15px] font-medium">
                {COMPARISON.nextlayer.map((item) => (
                  <div key={item}>{item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-surface-muted px-10 py-[140px]">
        <div className="mx-auto max-w-[1180px] text-center">
          <h2 className="mb-14 text-[32px] font-bold tracking-[-0.02em]">
            Simple, transparent pricing
          </h2>
          <DynamicPricingSection />
          <div className="mt-10">
            <Link href="/pricing" className="text-[15px]">
              Compare all features →
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-10 py-[140px]">
        <div className="mx-auto max-w-[720px]">
          <h2 className="mb-12 text-center text-[32px] font-bold tracking-[-0.02em]">
            Frequently asked questions
          </h2>
          <FaqList faqs={HOME_FAQS} defaultOpenIndex={0} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[radial-gradient(ellipse_800px_400px_at_50%_0%,oklch(0.93_0.04_255)_0%,transparent_70%)] px-10 py-[120px] text-center">
        <h2 className="mb-4 text-[36px] font-bold tracking-[-0.02em]">
          Ready to move your business to the cloud?
        </h2>
        <Link
          href="/register"
          className="bg-primary text-primary-foreground hover:bg-brand-hover mt-6 inline-block rounded-lg px-8 py-4 text-base font-semibold"
        >
          Get started
        </Link>
        <div className="mt-4">
          <Link href="/contact" className="text-[15px]">
            Talk to us
          </Link>
        </div>
      </section>

      <Footer variant="full" />
    </div>
  );
}
