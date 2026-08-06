import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { LogoStrip } from "@/components/common/logo-strip";
import { FormField } from "@/components/common/form-field";
import {
  ENTERPRISE_LOGOS,
  ENTERPRISE_CAPABILITIES,
  ENTERPRISE_TESTIMONIAL,
} from "@/constants/enterprise";

export const metadata: Metadata = {
  title: "Enterprise",
  description:
    "Dedicated infrastructure, custom contracts, and enterprise-grade support for organizations that can't compromise on security.",
};

export default function EnterprisePage() {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <Header />

      {/* Hero */}
      <section className="bg-foreground text-background px-10 py-[120px] text-center">
        <div className="text-dark-accent mb-4 text-[13px] font-semibold tracking-[0.06em] uppercase">
          Enterprise
        </div>
        <h1 className="mx-auto mb-5 max-w-[760px] text-[46px] font-bold tracking-[-0.02em]">
          Cloud storage that scales with your organization
        </h1>
        <p className="text-dark-muted-2 mx-auto mb-9 max-w-[560px] text-lg">
          Dedicated infrastructure, custom contracts, and enterprise-grade support for organizations
          that can&apos;t compromise on security.
        </p>
        <a
          href="#contact"
          className="bg-primary text-primary-foreground hover:bg-brand-hover inline-block rounded-lg px-8 py-4 text-base font-semibold"
        >
          Talk to sales
        </a>
      </section>

      <LogoStrip
        label="Trusted by enterprise teams at"
        logos={ENTERPRISE_LOGOS}
        logoClassName="text-[15px]"
      />

      {/* Capabilities */}
      <section className="px-10 py-[120px]">
        <div className="mx-auto max-w-[1080px]">
          <h2 className="mb-14 text-center text-[32px] font-bold tracking-[-0.02em]">
            Built for enterprise procurement and IT
          </h2>
          <div className="flex flex-col">
            {ENTERPRISE_CAPABILITIES.map((c) => (
              <div
                key={c.title}
                className="border-border-subtle flex items-baseline gap-10 border-b py-8"
              >
                <div className="w-[220px] flex-none text-[17px] font-semibold">{c.title}</div>
                <div className="text-muted-foreground flex-1 text-[15px] leading-[1.6]">
                  {c.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security blurb */}
      <section className="px-10 pb-[120px] text-center">
        <div className="mx-auto max-w-[640px]">
          <h3 className="mb-4 text-2xl font-bold">Security and compliance you can verify</h3>
          <p className="text-muted-foreground mb-5 text-base leading-[1.6]">
            SOC 2 Type II, ISO 27001, and GDPR compliant, with full audit trails and dedicated data
            residency options.
          </p>
          <a href="#" className="text-[15px] font-semibold">
            View our Security page →
          </a>
        </div>
      </section>

      {/* Testimonial */}
      <section className="px-10 pb-[120px]">
        <div className="bg-surface-muted mx-auto max-w-[760px] rounded-2xl p-12">
          <p className="mb-6 text-xl leading-[1.6]">&ldquo;{ENTERPRISE_TESTIMONIAL.quote}&rdquo;</p>
          <div className="text-[15px] font-semibold">{ENTERPRISE_TESTIMONIAL.name}</div>
          <div className="text-ink-450 text-sm">{ENTERPRISE_TESTIMONIAL.title}</div>
        </div>
      </section>

      {/* Contact form */}
      <section id="contact" className="px-10 pb-[140px]">
        <div className="mx-auto max-w-[640px]">
          <h2 className="mb-2 text-center text-[28px] font-bold tracking-[-0.02em]">
            Talk to our enterprise team
          </h2>
          <p className="text-ink-550 mb-10 text-center text-[15px]">
            We&apos;ll respond within one business day.
          </p>
          <form className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField id="ent-name" label="Name" />
              <FormField id="ent-email" label="Work email" type="email" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField id="ent-company" label="Company" />
              <FormField id="ent-size" label="Company size" />
            </div>
            <FormField id="ent-msg" label="Message" as="textarea" rows={4} />
            <button
              type="submit"
              className="bg-primary text-primary-foreground mt-2 rounded-lg p-3.5 text-[15px] font-semibold"
            >
              Contact sales
            </button>
          </form>
        </div>
      </section>

      <Footer variant="simple" />
    </div>
  );
}
