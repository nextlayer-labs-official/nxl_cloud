"use client";

import { useState } from "react";
import { FaqItem } from "@/components/common/faq-item";
import { FAQ_GROUPS } from "@/constants/faq";

export function FaqSearch() {
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const q = query.toLowerCase();
  const groups = FAQ_GROUPS.map((group) => {
    const filtered = group.items.filter((item) => !q || item.q.toLowerCase().includes(q));
    return { title: group.title, items: filtered };
  });
  const noResults = groups.every((g) => g.items.length === 0);

  return (
    <>
      <section className="px-10 pt-[88px] pb-8 text-center">
        <h1 className="mb-8 text-[40px] font-bold tracking-[-0.02em]">
          Frequently asked questions
        </h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions..."
          className="border-input mx-auto w-full max-w-[480px] rounded-lg border px-4 py-3 text-[15px]"
        />
      </section>

      <section className="px-10 pb-[120px]">
        <div className="mx-auto max-w-[720px]">
          {groups.map(
            (group) =>
              group.items.length > 0 && (
                <div key={group.title} className="mb-10">
                  <div className="text-ink-550 mb-3 text-[13px] font-semibold tracking-[0.04em] uppercase">
                    {group.title}
                  </div>
                  {group.items.map((item, idx) => {
                    const key = group.title + idx;
                    return (
                      <FaqItem
                        key={key}
                        question={item.q}
                        answer={item.a}
                        isOpen={openKey === key}
                        onToggle={() => setOpenKey((current) => (current === key ? null : key))}
                        compact
                      />
                    );
                  })}
                </div>
              ),
          )}
          {noResults && (
            <div className="text-ink-550 py-10 text-center text-[15px]">
              No matching questions. <a href="/contact">Contact support →</a>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
