import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { LogoStrip } from "@/components/common/logo-strip";
import { PARTNER_PANELS, PARTNER_LOGOS } from "@/constants/partners";

export const metadata: Metadata = {
  title: "Partners",
  description: "Build integrations, or bring secure cloud storage to your customers as a reseller.",
};

export default function PartnersPage() {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <Header />

      {/* Hero */}
      <section className="px-10 pt-[100px] pb-16 text-center">
        <h1 className="mb-4 text-[42px] font-bold tracking-[-0.02em]">
          Partner with Nextlayer Cloud
        </h1>
        <p className="text-muted-foreground mx-auto max-w-[560px] text-[17px]">
          Build integrations, or bring secure cloud storage to your customers as a reseller.
        </p>
      </section>

      {/* Partner panels */}
      <section className="px-10 pb-[100px]">
        <div className="mx-auto grid max-w-[1080px] grid-cols-2 gap-8">
          {PARTNER_PANELS.map((panel) => (
            <div key={panel.title} className="border-border rounded-2xl border p-9">
              <h3 className="mb-4 text-xl font-bold">{panel.title}</h3>
              <div className="text-muted-foreground mb-7 flex flex-col gap-2.5 text-sm">
                {panel.items.map((item) => (
                  <div key={item}>— {item}</div>
                ))}
              </div>
              <a
                href="#apply"
                className="border-input text-foreground inline-block rounded-lg border px-[22px] py-[11px] text-sm font-semibold"
              >
                {panel.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      <LogoStrip label="Featured partners" logos={PARTNER_LOGOS} />

      {/* Apply CTA */}
      <section id="apply" className="px-10 py-[100px] text-center">
        <h2 className="mb-3 text-[28px] font-bold tracking-[-0.02em]">Ready to apply?</h2>
        <p className="text-ink-550 mb-7 text-[15px]">
          Tell us about your business and we&apos;ll follow up within a few days.
        </p>
        <a
          href="/contact"
          className="bg-primary text-primary-foreground hover:bg-brand-hover inline-block rounded-lg px-7 py-3.5 text-[15px] font-semibold"
        >
          Apply now
        </a>
      </section>

      <Footer variant="simple" />
    </div>
  );
}
