"use client";

import { useState } from "react";

export interface RevenueTrendPoint {
  label: string;
  revenueCents: number;
  newOrgs: number;
}

function formatMoney(cents: number): string {
  return `₹${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Deliberately dual-axis (bars = new orgs on one scale, line = revenue on
 * another) — a known anti-pattern the dataviz skill flags, kept here as an
 * explicit, informed choice to match the reference design rather than an
 * oversight. Hand-rolled SVG, no charting library.
 */
export function RevenueTrendChart({ data }: { data: RevenueTrendPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const WIDTH = 640;
  const HEIGHT = 220;
  const PAD_LEFT = 8;
  const PAD_RIGHT = 8;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 28;
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const maxRevenue = Math.max(1, ...data.map((d) => d.revenueCents));
  const maxOrgs = Math.max(1, ...data.map((d) => d.newOrgs));
  const slotWidth = plotWidth / data.length;
  const barWidth = Math.min(28, slotWidth * 0.4);

  const points = data.map((d, i) => {
    const x = PAD_LEFT + slotWidth * (i + 0.5);
    const barHeight = (d.newOrgs / maxOrgs) * plotHeight * 0.85;
    const lineY = PAD_TOP + plotHeight - (d.revenueCents / maxRevenue) * plotHeight;
    return { ...d, x, barHeight, lineY };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.lineY}`).join(" ");

  return (
    <div className="relative">
      <div className="mb-3 flex items-center gap-4 text-[12px]">
        <div className="flex items-center gap-1.5">
          <span className="bg-accent h-2.5 w-2.5 rounded-full" />
          <span className="text-ink-450">Revenue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="bg-accent/30 h-2.5 w-2.5 rounded-sm" />
          <span className="text-ink-450">New orgs</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* recessive baseline */}
        <line x1={PAD_LEFT} y1={PAD_TOP + plotHeight} x2={WIDTH - PAD_RIGHT} y2={PAD_TOP + plotHeight} stroke="var(--border-subtle)" strokeWidth={1} />

        {points.map((p, i) => (
          <rect
            key={`bar-${p.label}`}
            x={p.x - barWidth / 2}
            y={PAD_TOP + plotHeight - p.barHeight}
            width={barWidth}
            height={p.barHeight}
            rx={4}
            className="fill-accent/20"
            opacity={hoverIndex === null || hoverIndex === i ? 1 : 0.4}
            style={{ transition: "opacity 120ms" }}
          />
        ))}

        <path d={linePath} fill="none" className="stroke-accent" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle
            key={`dot-${p.label}`}
            cx={p.x}
            cy={p.lineY}
            r={hoverIndex === i ? 5 : 3.5}
            className="fill-accent"
            style={{ transition: "r 120ms" }}
          />
        ))}

        {/* invisible hover hit-zones, one per month */}
        {points.map((p, i) => (
          <rect
            key={`hit-${p.label}`}
            x={PAD_LEFT + slotWidth * i}
            y={0}
            width={slotWidth}
            height={HEIGHT}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(i)}
          />
        ))}

        {points.map((p, i) => (
          <text
            key={`label-${p.label}`}
            x={p.x}
            y={HEIGHT - 8}
            textAnchor="middle"
            className="fill-ink-450"
            style={{ fontSize: 10 }}
          >
            {i % 2 === 0 || data.length <= 6 ? p.label.split(" ")[0] : ""}
          </text>
        ))}
      </svg>

      {hoverIndex !== null && (
        <div
          className="border-border-subtle bg-surface text-foreground pointer-events-none absolute rounded-lg border px-3 py-2 text-[12px] shadow-md"
          style={{
            left: `${(points[hoverIndex].x / WIDTH) * 100}%`,
            top: 0,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="font-semibold">{points[hoverIndex].label}</div>
          <div className="text-ink-450">Revenue: {formatMoney(points[hoverIndex].revenueCents)}</div>
          <div className="text-ink-450">New orgs: {points[hoverIndex].newOrgs}</div>
        </div>
      )}
    </div>
  );
}
