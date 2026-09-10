"use client";

import { createContext, useContext } from "react";
import type { DistributorUser } from "@/types/distributor";

export interface DistributorContextValue {
  distributor: DistributorUser;
}

export const DistributorContext = createContext<DistributorContextValue | null>(null);

export function useDistributor(): DistributorContextValue {
  const ctx = useContext(DistributorContext);
  if (!ctx) {
    throw new Error("useDistributor must be used within DistributorShell");
  }
  return ctx;
}
