"use client";

import { useState } from "react";

/**
 * Tracks which single accordion item is open, keyed by number (Home, Pricing) or
 * string (FAQ, which keys by "category+index" since items are grouped).
 */
export function useSingleOpenAccordion<T = number>(defaultOpenKey: T | null = null) {
  const [openKey, setOpenKey] = useState<T | null>(defaultOpenKey);

  function toggle(key: T) {
    setOpenKey((current) => (current === key ? null : key));
  }

  return { openKey, toggle };
}
