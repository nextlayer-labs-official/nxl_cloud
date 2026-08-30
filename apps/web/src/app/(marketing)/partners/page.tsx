import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PARTNER_BENEFITS } from "@/constants/partners";

export const metadata: Metadata = {
  title: "Partners",
  description: "Resell Nextlayer Cloud to your own customers, with your own portal and pricing.",
};

export default function PartnersPage() {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <Header />

      {/* Hero */}
      <section className="px-10 pt-[100px] pb-16 text-center">
        <h1 className="mb-4 text-[42px] font-bold tracking-[-0.02em]">
          Resell Nextlayer Cloud to your own customers
        </h1>
        <p className="text-muted-foreground mx-auto max-w-[560px] text-[17px]">
          Onboarded partners get a dedicated portal to manage every customer mapped to their code —
          their own pricing, their own wallet, no manual invoicing per change.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <a
            href="#apply"
            className="bg-primary text-primary-foreground hover:bg-brand-hover inline-block rounded-lg px-7 py-3.5 text-[15px] font-semibold"
          >
            Apply to become a partner
          </a>
          <Link
            href="/partner/login"
            className="border-input text-foreground inline-block rounded-lg border px-7 py-3.5 text-[15px] font-semibold"
          >
            Already a partner? Log in
          </Link>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-10 pb-[100px]">
        <div className="mx-auto grid max-w-[1080px] grid-cols-2 gap-8">
          {PARTNER_BENEFITS.map((benefit) => (
            <div key={benefit.title} className="border-border rounded-2xl border p-9">
              <h3 className="mb-3 text-xl font-bold">{benefit.title}</h3>
              <p className="text-muted-foreground text-sm leading-[1.6]">{benefit.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface-muted px-10 py-[100px]">
        <div className="mx-auto max-w-[720px] text-center">
          <h2 className="mb-10 text-[28px] font-bold tracking-[-0.02em]">How it works</h2>
          <div className="flex flex-col gap-6 text-left">
            <div>
              <div className="text-accent-foreground mb-1 text-sm font-semibold">1. We onboard you</div>
              <p className="text-muted-foreground text-sm leading-[1.6]">
                Apply below and we&apos;ll set you up with a partner code and portal login.
              </p>
            </div>
            <div>
              <div className="text-accent-foreground mb-1 text-sm font-semibold">2. Your customers map to your code</div>
              <p className="text-muted-foreground text-sm leading-[1.6]">
                They enter your code in their account settings — from then on, only you (or us) can
                change their plan.
              </p>
            </div>
            <div>
              <div className="text-accent-foreground mb-1 text-sm font-semibold">3. You manage their billing</div>
              <p className="text-muted-foreground text-sm leading-[1.6]">
                Activate or change their plan from your portal — it debits your wallet at your
                negotiated rate, not the retail price.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Apply CTA */}
      <section id="apply" className="px-10 py-[100px] text-center">
        <h2 className="mb-3 text-[28px] font-bold tracking-[-0.02em]">Ready to apply?</h2>
        <p className="text-ink-550 mb-7 text-[15px]">
          Tell us about your business and we&apos;ll follow up within a few days.
        </p>
        <Link
          href="/contact"
          className="bg-primary text-primary-foreground hover:bg-brand-hover inline-block rounded-lg px-7 py-3.5 text-[15px] font-semibold"
        >
          Apply now
        </Link>
      </section>

      <Footer variant="simple" />
    </div>
  );
}
