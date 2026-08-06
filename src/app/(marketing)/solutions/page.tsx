import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SolutionsSegments } from "@/components/marketing/solutions-segments";

export const metadata: Metadata = {
  title: "Solutions",
  description: "See how Nextlayer Cloud fits your team's function or your company's stage.",
};

export default function SolutionsPage() {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <Header />

      {/* Hero */}
      <section className="px-10 pt-[88px] pb-12 text-center">
        <div className="text-accent-foreground mb-4 text-[13px] font-semibold tracking-[0.06em] uppercase">
          Solutions
        </div>
        <h1 className="mb-4 text-[44px] font-bold tracking-[-0.02em]">
          Built for how your organization works
        </h1>
        <p className="text-muted-foreground mx-auto max-w-[600px] text-lg">
          See how Nextlayer Cloud fits your team&apos;s function or your company&apos;s stage.
        </p>
      </section>

      <SolutionsSegments />

      {/* CTA */}
      <section className="px-10 py-[100px] text-center">
        <h2 className="mb-4 text-[32px] font-bold tracking-[-0.02em]">
          Ready to see it for your team?
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
