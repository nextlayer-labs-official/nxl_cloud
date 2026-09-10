import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { DistributorLoginForm } from "@/components/distributor/distributor-login-form";

export const metadata: Metadata = {
  title: "Distributor sign in",
};

export default function DistributorLoginPage() {
  return (
    <AuthShell>
      <DistributorLoginForm />
    </AuthShell>
  );
}
