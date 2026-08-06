"use client";

import { useState } from "react";
import { FilterPill } from "@/components/common/filter-pill";
import {
  SEGMENTS,
  TEAM_SEGMENT_IDS,
  SIZE_SEGMENT_IDS,
  DEFAULT_SEGMENT_ID,
} from "@/constants/solutions";

export function SolutionsSegments() {
  const [activeId, setActiveId] = useState(DEFAULT_SEGMENT_ID);
  const active = SEGMENTS[activeId];

  return (
    <>
      <section className="px-10 pb-8">
        <div className="mx-auto flex max-w-[900px] flex-col items-center gap-5">
          <div className="flex flex-wrap justify-center gap-2">
            {TEAM_SEGMENT_IDS.map((id) => (
              <FilterPill key={id} active={activeId === id} onClick={() => setActiveId(id)}>
                {SEGMENTS[id].label}
              </FilterPill>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {SIZE_SEGMENT_IDS.map((id) => (
              <FilterPill key={id} active={activeId === id} onClick={() => setActiveId(id)}>
                {SEGMENTS[id].label}
              </FilterPill>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-muted px-10 pt-16 pb-[120px]">
        <div className="mx-auto max-w-[1080px]">
          <div className="mx-auto mb-14 max-w-[640px] text-center">
            <h2 className="mb-4 text-[32px] font-bold tracking-[-0.02em]">{active.headline}</h2>
            <p className="text-muted-foreground text-[17px] leading-[1.6]">{active.body}</p>
          </div>
          <div className="mb-14 grid grid-cols-3 gap-6">
            {active.benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="border-border-subtle bg-background rounded-2xl border p-7"
              >
                <h4 className="mb-2.5 text-[17px] font-semibold">{benefit.title}</h4>
                <p className="text-muted-foreground text-sm leading-[1.6]">{benefit.body}</p>
              </div>
            ))}
          </div>
          <div className="border-border-subtle bg-background mx-auto max-w-[640px] rounded-2xl border p-8">
            <p className="mb-4 text-base leading-[1.6]">&ldquo;{active.quote}&rdquo;</p>
            <div className="text-sm font-semibold">{active.quoteName}</div>
            <div className="text-ink-550 text-[13px]">{active.quoteTitle}</div>
          </div>
        </div>
      </section>
    </>
  );
}
