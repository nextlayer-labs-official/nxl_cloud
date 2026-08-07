"use client";

import { createContext, useContext } from "react";
import type { PortalOrganization, PortalUser } from "@/types/portal";

export interface PortalContextValue {
  user: PortalUser;
  organization: PortalOrganization;
  refresh: () => Promise<void>;
}

export const PortalContext = createContext<PortalContextValue | null>(null);

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) {
    throw new Error("usePortal must be used within PortalShell");
  }
  return ctx;
}
