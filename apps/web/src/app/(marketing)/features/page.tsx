import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FeatureRow } from "@/components/marketing/feature-row";
import { FEATURE_SECTIONS } from "@/constants/features";

export const metadata: Metadata = {
  title: "Features",
  description:
    "From storage to audit trails — a closer look at how Nextlayer Cloud handles the details.",
};

export default function FeaturesPage() {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <Header />

      {/* Hero */}
      <section className="px-10 pt-[88px] pb-14 text-center">
        <div className="text-accent-foreground mb-4 text-[13px] font-semibold tracking-[0.06em] uppercase">
          Features
        </div>
        <h1 className="mb-4 text-[44px] font-bold tracking-[-0.02em]">
          Everything your team needs to manage files, securely
        </h1>
        <p className="text-muted-foreground mx-auto max-w-[600px] text-lg">
          From storage to audit trails — a closer look at how Nextlayer Cloud handles the details.
        </p>
      </section>

      {/* Sticky in-page nav */}
      <nav className="border-border-subtle bg-background sticky top-[72px] z-40 overflow-x-auto border-b">
        <div className="mx-auto flex max-w-[1080px] gap-2 px-10 py-3.5">
          {FEATURE_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="text-ink-700 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap"
            >
              {section.navLabel}
            </a>
          ))}
        </div>
      </nav>

      {/* Feature sections */}
      <section className="px-10">
        <div className="mx-auto flex max-w-[1080px] flex-col">
          {FEATURE_SECTIONS.map((row) => (
            <FeatureRow key={row.id} row={row} visualClassName="h-[280px]" className="py-24" />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-surface-muted mt-10 px-10 py-[100px] text-center">
        <h2 className="mb-4 text-[32px] font-bold tracking-[-0.02em]">See it all in action</h2>
        <p className="text-muted-foreground mb-8 text-[17px]">
          Start a free trial — no credit card required.
        </p>
        <Link
          href="/register"
          className="bg-primary text-primary-foreground hover:bg-brand-hover inline-block rounded-lg px-8 py-4 text-base font-semibold"
        >
          Start free trial
        </Link>
      </section>

      <Footer variant="simple" />
    </div>
  );
}
