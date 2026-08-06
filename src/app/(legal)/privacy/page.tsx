import type { Metadata } from "next";
import { LegalShell } from "@/components/layout/legal-shell";
import { PRIVACY_SECTIONS, LEGAL_LAST_UPDATED } from "@/constants/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={PRIVACY_SECTIONS}
      contactPrompt="Questions about this policy?"
    />
  );
}
