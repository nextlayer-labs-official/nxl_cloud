import { PartnerShell } from "@/components/partner/partner-shell";

export default function PartnerDashboardLayout({ children }: { children: React.ReactNode }) {
  return <PartnerShell>{children}</PartnerShell>;
}
