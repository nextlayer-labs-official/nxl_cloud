import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsNewTimeline } from "@/components/marketing/whats-new-timeline";

export const metadata: Metadata = {
  title: "What's New",
  description: "The latest features and improvements shipped to Skylyer.",
};

export default function WhatsNewPage() {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <Header />

      <section className="px-10 pt-[88px] pb-14 text-center">
        <span className="border-border-subtle text-muted-foreground mb-6 inline-flex items-center rounded-full border px-4 py-1.5 text-[13px] font-medium">
          What&apos;s New
        </span>
        <h1 className="mb-4 text-[44px] font-bold tracking-[-0.02em]">
          What&apos;s New — Skylyer <span className="text-primary">Changelog</span>
        </h1>
        <p className="text-muted-foreground mx-auto max-w-[600px] text-lg">
          See what&apos;s new at Skylyer. Track feature releases and improvements as they ship.
        </p>
      </section>

      <WhatsNewTimeline />

      <section className="bg-surface-muted px-10 py-[100px] text-center">
        <h2 className="mb-4 text-[32px] font-bold tracking-[-0.02em]">See it for yourself</h2>
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
