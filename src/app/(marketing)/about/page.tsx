import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PlaceholderVisual } from "@/components/common/placeholder-visual";
import { StatGrid } from "@/components/marketing/stat-grid";
import { VALUES, LEADERS, ABOUT_STATS } from "@/constants/about";

export const metadata: Metadata = {
  title: "About",
  description: "We believe every business deserves enterprise-grade control over its files.",
};

export default function AboutPage() {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <Header />

      {/* Hero */}
      <section className="px-10 pt-[120px] pb-16 text-center">
        <h1 className="mx-auto max-w-[680px] text-[42px] font-bold tracking-[-0.02em]">
          We believe every business deserves enterprise-grade control over its files.
        </h1>
      </section>

      {/* Story */}
      <section className="px-10 pb-[100px]">
        <div className="mx-auto grid max-w-[900px] grid-cols-2 items-center gap-12">
          <PlaceholderVisual label="team photo placeholder" className="h-[280px] rounded-2xl" />
          <div>
            <p className="text-ink-600 mb-4 text-base leading-[1.7]">
              Nextlayer Labs was founded in 2019 after our team spent years watching businesses
              outgrow consumer-grade cloud storage tools that were never built for their scale or
              security needs.
            </p>
            <p className="text-ink-600 text-base leading-[1.7]">
              Today, Nextlayer Cloud is trusted by thousands of organizations to store, share, and
              govern the files their business depends on.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-surface-muted px-10 py-20">
        <div className="mx-auto grid max-w-[1080px] grid-cols-3 gap-8 text-center">
          {VALUES.map((value) => (
            <div key={value.title}>
              <h4 className="mb-2.5 text-lg font-bold">{value.title}</h4>
              <p className="text-muted-foreground text-sm leading-[1.6]">{value.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Leadership */}
      <section className="px-10 py-[100px]">
        <div className="mx-auto max-w-[1080px]">
          <h2 className="mb-12 text-center text-[28px] font-bold tracking-[-0.02em]">Leadership</h2>
          <div className="grid grid-cols-4 gap-6">
            {LEADERS.map((leader) => (
              <div key={leader.name} className="text-center">
                <PlaceholderVisual
                  label="photo"
                  className="mb-3 h-[140px] rounded-xl text-[11px]"
                />
                <div className="text-[15px] font-semibold">{leader.name}</div>
                <div className="text-ink-450 text-[13px]">{leader.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-10 pb-[100px]">
        <div className="mx-auto max-w-[900px]">
          <StatGrid stats={ABOUT_STATS} size="compact" className="grid-cols-4" />
        </div>
      </section>

      {/* Hiring CTA */}
      <section className="px-10 pt-20 pb-[120px] text-center">
        <h2 className="mb-5 text-[26px] font-bold tracking-[-0.02em]">We&apos;re hiring</h2>
        <a
          href="#"
          className="bg-primary text-primary-foreground hover:bg-brand-hover inline-block rounded-lg px-7 py-3.5 text-[15px] font-semibold"
        >
          View open roles
        </a>
      </section>

      <Footer variant="simple" />
    </div>
  );
}
