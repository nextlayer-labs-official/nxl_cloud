import { cn } from "@/lib/utils";

interface LogoStripProps {
  label: string;
  logos: string[];
  logoClassName?: string;
}

/** "Trusted by teams at ..." strip — reused on Home, Enterprise, and Partners. */
export function LogoStrip({ label, logos, logoClassName }: LogoStripProps) {
  return (
    <section className="bg-surface-muted px-10 py-12">
      <div className="mx-auto flex max-w-[1280px] items-center gap-10">
        <div className="text-ink-450 text-[13px] whitespace-nowrap">{label}</div>
        <div className="flex flex-1 justify-between gap-6">
          {logos.map((name) => (
            <div key={name} className={cn("text-ink-400 font-mono text-sm", logoClassName)}>
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
