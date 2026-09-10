import { DistributorShell } from "@/components/distributor/distributor-shell";

export default function DistributorDashboardLayout({ children }: { children: React.ReactNode }) {
  return <DistributorShell>{children}</DistributorShell>;
}
