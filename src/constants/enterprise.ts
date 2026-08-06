import type { EnterpriseCapability } from "@/types/marketing";

export const ENTERPRISE_LOGOS = [
  "Stellar Financial",
  "Vantage Group",
  "Umbra Inc.",
  "Globex Logistics",
  "Initech",
];

export const ENTERPRISE_CAPABILITIES: EnterpriseCapability[] = [
  {
    title: "SSO & SCIM",
    body: "Integrate with Okta, Azure AD, or any SAML/SCIM identity provider for automated provisioning and deprovisioning.",
  },
  {
    title: "Dedicated support & SLA",
    body: "A named customer success manager and guaranteed response times, backed by a contractual uptime SLA.",
  },
  {
    title: "Custom contracts",
    body: "Master service agreements, security addendums, and procurement terms tailored to your organization.",
  },
  {
    title: "Admin controls",
    body: "Organization-wide policy enforcement, centralized user management, and delegated admin roles.",
  },
  {
    title: "Data residency",
    body: "Choose the region your data is stored and processed in to meet local regulatory requirements.",
  },
];

export const ENTERPRISE_TESTIMONIAL = {
  quote:
    "Nextlayer Cloud's enterprise team worked directly with our procurement office. We went from evaluation to full rollout across 4,000 employees in under two months.",
  name: "Marcus Webb",
  title: "Head of Security, Stellar Financial",
};
