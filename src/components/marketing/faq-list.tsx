"use client";

import { FaqItem } from "@/components/common/faq-item";
import { useSingleOpenAccordion } from "@/hooks/use-single-open-accordion";
import type { FaqEntry } from "@/types/marketing";

interface FaqListProps {
  faqs: FaqEntry[];
  defaultOpenIndex?: number | null;
  compact?: boolean;
}

/** Flat FAQ accordion list — used by Home and Pricing (FAQ page groups by category instead). */
export function FaqList({ faqs, defaultOpenIndex = null, compact }: FaqListProps) {
  const { openKey, toggle } = useSingleOpenAccordion<number>(defaultOpenIndex);

  return (
    <div className="flex flex-col">
      {faqs.map((faq, index) => (
        <FaqItem
          key={faq.q}
          question={faq.q}
          answer={faq.a}
          isOpen={openKey === index}
          onToggle={() => toggle(index)}
          compact={compact}
        />
      ))}
    </div>
  );
}
