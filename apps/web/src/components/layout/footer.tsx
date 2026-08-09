import Link from "next/link";
import { FOOTER_COLUMNS, DEFAULT_COPYRIGHT } from "@/constants/footer";

interface FooterProps {
  variant: "full" | "simple" | "legal";
  copyright?: string;
}

export function Footer({ variant, copyright = DEFAULT_COPYRIGHT }: FooterProps) {
  if (variant === "legal") {
    return (
      <footer className="border-border-subtle bg-surface-muted text-ink-450 border-t px-10 py-10 text-center text-[13px]">
        {copyright}
      </footer>
    );
  }

  if (variant === "simple") {
    return (
      <footer className="border-border-subtle bg-surface-muted border-t px-10 pt-14 pb-10">
        <div className="text-ink-450 mx-auto flex max-w-[1280px] items-center justify-between text-[13px]">
          <div>{copyright}</div>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-ink-450">
              Privacy
            </Link>
            <Link href="/terms" className="text-ink-450">
              Terms
            </Link>
            <Link href="/" className="text-ink-450">
              Home
            </Link>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-border-subtle bg-surface-muted border-t px-10 pt-20 pb-10">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-14 grid grid-cols-[1.4fr_repeat(3,1fr)] gap-10">
          <div>
            <div className="mb-3 text-lg font-bold">Nextlayer Cloud</div>
            <p className="text-muted-foreground mb-5 max-w-[220px] text-sm">
              Secure cloud storage for modern businesses.
            </p>
            <div className="flex gap-2">
              <input
                placeholder="Work email"
                className="border-input flex-1 rounded-lg border px-3 py-2.5 text-sm"
              />
              <button
                type="button"
                className="bg-foreground text-background rounded-lg px-4 py-2.5 text-sm font-semibold"
              >
                Subscribe
              </button>
            </div>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="text-ink-550 mb-4 text-[13px] font-semibold tracking-[0.04em] uppercase">
                {col.title}
              </div>
              <div className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <Link key={link.label} href={link.href} className="text-ink-700 text-sm">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-border text-ink-450 flex items-center justify-between border-t pt-8 text-[13px]">
          <div>{copyright}</div>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-ink-450">
              Privacy
            </Link>
            <Link href="/terms" className="text-ink-450">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
