import type { Metadata } from "next";
import { LegalShell } from "@/components/layout/legal-shell";
import { ACCEPTABLE_USE_SECTIONS, LEGAL_LAST_UPDATED } from "@/constants/legal";

export const metadata: Metadata = {
  title: "Acceptable Use Policy",
};

export default function AcceptableUsePage() {
  return (
    <LegalShell
      title="Acceptable Use Policy"
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={ACCEPTABLE_USE_SECTIONS}
      contactPrompt="Questions about this policy?"
    />
  );
}
