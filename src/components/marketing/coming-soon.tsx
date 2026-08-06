import Link from "next/link";

interface ComingSoonProps {
  eyebrow: string;
  title: string;
  description: string;
}

/**
 * Placeholder for routes linked from nav/footer that weren't part of the design
 * export (Security, Developers, Careers, Resources, Documentation). Swap for a
 * real page once content/design is provided.
 */
export function ComingSoon({ eyebrow, title, description }: ComingSoonProps) {
  return (
    <section className="px-10 pt-24 pb-[140px] text-center">
      <div className="mx-auto max-w-[600px]">
        <div className="text-accent-foreground mb-4 text-[13px] font-semibold tracking-[0.06em] uppercase">
          {eyebrow}
        </div>
        <h1 className="mb-4 text-[44px] font-bold tracking-[-0.02em]">{title}</h1>
        <p className="text-muted-foreground mb-9 text-lg">{description}</p>
        <Link
          href="/"
          className="bg-primary text-primary-foreground hover:bg-brand-hover inline-block rounded-lg px-7 py-3.5 text-base font-semibold"
        >
          Back to home
        </Link>
      </div>
    </section>
  );
}
