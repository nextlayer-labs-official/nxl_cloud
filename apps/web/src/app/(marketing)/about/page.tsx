import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PlaceholderVisual } from "@/components/common/placeholder-visual";
import { VALUES } from "@/constants/about";

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
          <PlaceholderVisual label="product visual placeholder" className="h-[280px] rounded-2xl" />
          <div>
            <p className="text-ink-600 mb-4 text-base leading-[1.7]">
              Nextlayer Cloud was built for teams that outgrow consumer-grade cloud storage —
              organizations that need real access control, a full audit trail, and billing that
              actually fits how they buy software, not just a bigger storage quota.
            </p>
            <p className="text-ink-600 text-base leading-[1.7]">
              That includes supporting resellers directly: partners get their own portal to manage
              pricing and plans for the customers they bring on, instead of routing every change
              through us.
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

      <Footer variant="simple" />
    </div>
  );
}
