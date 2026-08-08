import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalShell } from "@/components/portal/portal-shell";

export const metadata: Metadata = {
  title: "Portal",
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PortalShell>{children}</PortalShell>
    </Suspense>
  );
}
