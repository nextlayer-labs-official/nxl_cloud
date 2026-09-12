"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export interface DonutSlice {
  label: string;
  value: number;
  /** { light, dark } so the same slice reads correctly in both themes — see the dataviz skill's validated categorical/status palettes. */
  color: { light: string; dark: string };
}

/**
 * Hand-rolled SVG donut (stroke-dasharray segments, rounded caps, a thin
 * surface gap between slices) + a legend that's always present (2+ series
 * per the dataviz skill's accessibility rule — identity is never color-alone).
 * Hovering a legend row highlights its slice; the center shows the total.
 */
export function DonutChart({
  data,
  centerLabel,
  centerSubLabel,
  formatValue,
}: {
  data: DonutSlice[];
  centerLabel: string;
  centerSubLabel: string;
  formatValue: (value: number) => string;
}) {
  const gradientId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const RADIUS = 40;
  const STROKE = 14;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const GAP_DEG = data.length > 1 ? 3 : 0;

  let cursorDeg = -90;
  const arcs = data.map((slice, i) => {
    const fraction = total > 0 ? slice.value / total : 0;
    const sliceDeg = fraction * 360;
    const startDeg = cursorDeg;
    cursorDeg += sliceDeg;
    const drawnDeg = Math.max(0, sliceDeg - GAP_DEG);
    const dash = (drawnDeg / 360) * CIRCUMFERENCE;
    return { ...slice, index: i, startDeg, dash, percent: Math.round(fraction * 100) };
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="var(--border-subtle)" strokeWidth={STROKE} opacity={0.5} />
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke={`var(--donut-${gradientId}-${arc.index})`}
              strokeWidth={activeIndex === arc.index ? STROKE + 3 : STROKE}
              strokeLinecap="round"
              strokeDasharray={`${arc.dash} ${CIRCUMFERENCE - arc.dash}`}
              strokeDashoffset={-((arc.startDeg / 360) * CIRCUMFERENCE)}
              opacity={activeIndex === null || activeIndex === arc.index ? 1 : 0.35}
              style={{ transition: "opacity 120ms, stroke-width 120ms" }}
            />
          ))}
        </svg>
        <style>
          {data
            .map(
              (slice, i) =>
                `:root:not([data-theme="dark"]) { --donut-${gradientId}-${i}: ${slice.color.light}; } :root[data-theme="dark"] { --donut-${gradientId}-${i}: ${slice.color.dark}; } @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --donut-${gradientId}-${i}: ${slice.color.dark}; } }`,
            )
            .join(" ")}
        </style>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-foreground text-lg font-bold tracking-[-0.02em]">{centerLabel}</div>
          <div className="text-ink-450 text-[11px]">{centerSubLabel}</div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5">
        {arcs.map((arc) => (
          <div
            key={arc.label}
            className={cn("flex items-center justify-between rounded-md px-1.5 py-0.5 text-[13px] transition-colors", activeIndex === arc.index && "bg-surface-muted")}
            onMouseEnter={() => setActiveIndex(arc.index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: `var(--donut-${gradientId}-${arc.index})` }}
              />
              <span className="text-foreground truncate font-medium">{arc.label}</span>
            </div>
            <span className="text-ink-450 shrink-0">
              {formatValue(arc.value)} · {arc.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
