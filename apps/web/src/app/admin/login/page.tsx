import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { AuthShell } from "@/components/layout/auth-shell";

export const metadata: Metadata = {
  title: "Admin sign in",
};

export default function AdminLoginPage() {
  return (
    <AuthShell>
      <AdminLoginForm />
    </AuthShell>
  );
}
