import type { Metadata } from "next";
import { LegalShell } from "@/components/layout/legal-shell";
import { REFUND_CANCELLATION_SECTIONS, LEGAL_LAST_UPDATED } from "@/constants/legal";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
};

export default function RefundCancellationPage() {
  return (
    <LegalShell
      title="Refund & Cancellation Policy"
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={REFUND_CANCELLATION_SECTIONS}
      contactPrompt="Questions about this policy?"
    />
  );
}
