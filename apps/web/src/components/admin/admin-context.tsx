"use client";

import { createContext, useContext } from "react";
import type { AdminUser } from "@/types/admin";

export interface AdminContextValue {
  adminUser: AdminUser;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdmin must be used within AdminShell");
  }
  return ctx;
}
