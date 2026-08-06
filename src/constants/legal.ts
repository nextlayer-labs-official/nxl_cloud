import type { LegalSection } from "@/types/legal";

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: "collection",
    title: "1. Information We Collect",
    body: "We collect account information, file metadata, and usage data necessary to provide and improve the Nextlayer Cloud service.",
  },
  {
    id: "use",
    title: "2. How We Use Information",
    body: "We use collected information to operate the service, provide support, ensure security, and communicate important account updates.",
  },
  {
    id: "sharing",
    title: "3. Data Sharing",
    body: "We do not sell customer data. Data is shared only with subprocessors necessary to deliver the service, under strict contractual protections.",
  },
  {
    id: "security",
    title: "4. Security",
    body: "All data is encrypted in transit and at rest. Access is restricted by role-based controls and logged for audit purposes.",
  },
  {
    id: "retention",
    title: "5. Data Retention",
    body: "Files and account data are retained for the duration of your subscription and deleted within 30 days of account termination, unless otherwise required by law.",
  },
  {
    id: "rights",
    title: "6. Your Rights",
    body: "You may request access to, correction of, or deletion of your personal data at any time by contacting our support team.",
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    body: "By accessing or using Nextlayer Cloud, you agree to be bound by these Terms of Service and our Privacy Policy.",
  },
  {
    id: "accounts",
    title: "2. Accounts",
    body: "You are responsible for maintaining the security of your account credentials and for all activity under your account.",
  },
  {
    id: "acceptable-use",
    title: "3. Acceptable Use",
    body: "You may not use the service to store or distribute unlawful content, or to attempt to gain unauthorized access to other accounts or systems.",
  },
  {
    id: "payment",
    title: "4. Payment & Billing",
    body: "Paid plans are billed in advance on a monthly or annual basis. Fees are non-refundable except as required by law.",
  },
  {
    id: "termination",
    title: "5. Termination",
    body: "Either party may terminate this agreement at any time. Upon termination, access to the service will be revoked and data handled per our Privacy Policy.",
  },
  {
    id: "liability",
    title: "6. Limitation of Liability",
    body: "Nextlayer Labs is not liable for indirect, incidental, or consequential damages arising from use of the service, to the maximum extent permitted by law.",
  },
];

export const LEGAL_LAST_UPDATED = "July 1, 2026";
