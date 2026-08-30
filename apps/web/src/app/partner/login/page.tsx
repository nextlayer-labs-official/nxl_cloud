import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { PartnerLoginForm } from "@/components/partner/partner-login-form";

export const metadata: Metadata = {
  title: "Partner sign in",
};

export default function PartnerLoginPage() {
  return (
    <AuthShell>
      <PartnerLoginForm />
    </AuthShell>
  );
}
