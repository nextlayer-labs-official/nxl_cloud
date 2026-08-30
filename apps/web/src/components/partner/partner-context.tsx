"use client";

import { createContext, useContext } from "react";
import type { PartnerUser } from "@/types/partner";

export interface PartnerContextValue {
  partner: PartnerUser;
}

export const PartnerContext = createContext<PartnerContextValue | null>(null);

export function usePartner(): PartnerContextValue {
  const ctx = useContext(PartnerContext);
  if (!ctx) {
    throw new Error("usePartner must be used within PartnerShell");
  }
  return ctx;
}
