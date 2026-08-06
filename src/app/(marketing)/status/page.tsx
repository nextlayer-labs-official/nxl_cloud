import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { STATUS_COMPONENTS, INCIDENTS, LAST_UPDATED } from "@/constants/status";

export const metadata: Metadata = {
  title: "Status",
};

export default function StatusPage() {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <Header />

      {/* Status banner */}
      <section className="px-10 pt-16 pb-10">
        <div className="mx-auto max-w-[800px]">
          <div className="border-success-border bg-success-bg mb-3 flex items-center gap-3 rounded-xl border px-6 py-5">
            <div className="bg-success h-2.5 w-2.5 rounded-full" />
            <div className="text-base font-semibold">All systems operational</div>
          </div>
          <div className="text-ink-450 text-right text-[13px]">Last updated: {LAST_UPDATED}</div>
        </div>
      </section>

      {/* Components */}
      <section className="px-10 pb-20">
        <div className="border-border mx-auto max-w-[800px] overflow-hidden rounded-xl border">
          {STATUS_COMPONENTS.map((c) => (
            <div
              key={c.name}
              className="flex items-center justify-between border-b border-[oklch(0.94_0.005_260)] px-6 py-[18px]"
            >
              <div className="text-[15px]">{c.name}</div>
              <div className="flex items-center gap-2">
                <div className="bg-success h-2 w-2 rounded-full" />
                <div className="text-ink-600 text-[13px]">{c.status}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Incident history */}
      <section className="px-10 pb-[100px]">
        <div className="mx-auto max-w-[800px]">
          <h2 className="mb-6 text-xl font-bold">Incident history</h2>
          <div className="flex flex-col gap-5">
            {INCIDENTS.map((incident) => (
              <div key={incident.title} className="border-border border-l-2 pl-5">
                <div className="text-ink-450 mb-1 text-[13px]">{incident.date}</div>
                <div className="mb-1 text-[15px] font-semibold">{incident.title}</div>
                <div className="text-muted-foreground text-sm">{incident.resolution}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscribe */}
      <section className="px-10 pb-[100px] text-center">
        <a href="#" className="text-sm font-semibold">
          Subscribe to status updates →
        </a>
      </section>

      <Footer variant="simple" />
    </div>
  );
}
