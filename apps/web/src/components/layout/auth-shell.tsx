import Link from "next/link";
import { cn } from "@/lib/utils";

export function AuthShell({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="text-foreground flex min-h-screen w-full flex-col bg-[radial-gradient(ellipse_900px_600px_at_50%_0%,oklch(0.95_0.03_255)_0%,oklch(1_0_0)_65%)]">
      <header className="px-10 py-6">
        <Link href="/" className="text-foreground text-[19px] font-bold tracking-[-0.02em]">
          Nextlayer Cloud
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center p-10">
        <div
          className={cn(
            "border-border-subtle bg-background w-full rounded-2xl border p-10 shadow-[0_24px_60px_-20px_oklch(0.22_0.02_260_/_0.15)]",
            wide ? "max-w-[640px]" : "max-w-[420px]",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
