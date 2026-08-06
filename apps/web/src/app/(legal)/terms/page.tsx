import type { Metadata } from "next";
import { LegalShell } from "@/components/layout/legal-shell";
import { TERMS_SECTIONS, LEGAL_LAST_UPDATED } from "@/constants/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={TERMS_SECTIONS}
      contactPrompt="Questions about these terms?"
    />
  );
}
