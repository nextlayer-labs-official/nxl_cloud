import Link from "next/link";
import type { LegalSection } from "@/types/legal";
import { Footer } from "@/components/layout/footer";

interface LegalShellProps {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
  contactPrompt: string;
}

export function LegalShell({ title, lastUpdated, sections, contactPrompt }: LegalShellProps) {
  return (
    <div className="text-foreground w-full overflow-x-hidden">
      <header className="border-border-subtle bg-background sticky top-0 z-50 border-b">
        <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-6">
          <Link href="/" className="text-foreground text-[19px] font-bold tracking-[-0.02em]">
            Nextlayer Cloud
          </Link>
          <Link href="/" className="text-ink-550 text-sm">
            Back to home
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1080px] grid-cols-[200px_1fr] gap-12 px-10 pt-16 pb-30">
        <aside className="sticky top-[96px] self-start">
          <div className="text-ink-550 mb-3 text-xs font-semibold tracking-[0.04em] uppercase">
            On this page
          </div>
          <div className="flex flex-col gap-2.5">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-muted-foreground text-[13px]"
              >
                {section.title}
              </a>
            ))}
          </div>
        </aside>

        <main className="max-w-[680px]">
          <h1 className="mb-2 text-[32px] font-bold tracking-[-0.02em]">{title}</h1>
          <div className="text-ink-550 mb-12 text-sm">Last updated: {lastUpdated}</div>
          {sections.map((section) => (
            <div key={section.id} id={section.id} className="mb-9">
              <h2 className="mb-3 text-[19px] font-bold">{section.title}</h2>
              <p className="text-[15px] leading-[1.7] text-[oklch(0.3_0.02_260)]">{section.body}</p>
            </div>
          ))}
          <p className="text-ink-550 mt-12 text-sm">
            {contactPrompt} <Link href="/contact">Contact us</Link>.
          </p>
        </main>
      </div>

      <Footer variant="legal" />
    </div>
  );
}
