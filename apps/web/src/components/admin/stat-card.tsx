"use client";

import Link from "next/link";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
  label: string;
  value: string;
  hint?: string;
  /** Omit entirely when there's no honest way to compute a period-over-period change for this value — a fabricated 0% is worse than no badge. */
  deltaPercent?: number;
  href: string;
}

/** Shared colored-icon stat card used across the admin dashboard (Overview, Organizations, ...). */
export function StatCard({ icon: Icon, iconClassName, label, value, hint, deltaPercent, href }: StatCardProps) {
  const isUp = deltaPercent !== undefined && deltaPercent >= 0;
  return (
    <Link
      href={href}
      className="border-border-subtle hover:bg-surface-muted group flex flex-col gap-3 rounded-xl border p-5 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", iconClassName)}>
          <Icon className="h-4 w-4" />
        </div>
        <ChevronRight className="text-ink-450 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div>
        <div className="text-ink-450 text-xs font-semibold tracking-wide uppercase">{label}</div>
        <div className="text-foreground mt-1 text-2xl font-bold tracking-[-0.02em]">{value}</div>
        <div className="mt-1 flex items-center gap-1.5">
          {deltaPercent !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[12px] font-semibold",
                isUp ? "text-success" : "text-error-text",
              )}
            >
              {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(deltaPercent)}%
            </span>
          )}
          {hint && <span className="text-ink-450 text-[12px]">{hint}</span>}
        </div>
      </div>
    </Link>
  );
}
