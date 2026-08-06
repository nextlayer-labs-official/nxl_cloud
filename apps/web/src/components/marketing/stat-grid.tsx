import { cn } from "@/lib/utils";
import type { StatEntry } from "@/types/marketing";

interface StatGridProps {
  stats: StatEntry[];
  className?: string;
  /** Home's benefits grid is larger type than About's company stats. */
  size?: "large" | "compact";
}

/** Big-number stat row — reused by Home's benefits grid and About's company stats. */
export function StatGrid({ stats, className, size = "large" }: StatGridProps) {
  return (
    <div className={cn("grid gap-8 text-center", className)}>
      {stats.map((stat) => (
        <div key={stat.label}>
          <div
            className={cn(
              "text-foreground font-bold tracking-[-0.02em]",
              size === "large" ? "text-[40px]" : "text-[32px]",
            )}
          >
            {stat.value}
          </div>
          <div
            className={cn(
              "text-muted-foreground",
              size === "large" ? "mt-2 text-[15px]" : "text-ink-450 mt-1.5 text-[13px]",
            )}
          >
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
