import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "@/components/marketing/login-form";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
