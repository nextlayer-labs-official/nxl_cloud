import type {
  FeatureRowData,
  SecurityColumn,
  StatEntry,
  PricingTierData,
  Testimonial,
  FaqEntry,
} from "@/types/marketing";

export const TRUSTED_LOGOS = ["Acme", "Globex", "Initech", "Umbra", "Stellar", "Vantage"];

export const FEATURE_ROWS: FeatureRowData[] = [
  {
    eyebrow: "Storage",
    title: "Unlimited flexibility, zero clutter",
    body: "Multi-device sync and rich file previews keep every team member working from the same source of truth, on any device.",
    direction: "row",
    visualLabel: "storage / preview UI",
  },
  {
    eyebrow: "Sharing & Permissions",
    title: "Share confidently, control precisely",
    body: "Granular, role-based permissions and organization-wide sharing policies keep sensitive files exactly where they belong.",
    direction: "row-reverse",
    visualLabel: "permissions UI",
  },
  {
    eyebrow: "Teams",
    title: "Built for how teams actually work",
    body: "Shared team spaces, activity feeds, and complete version history make collaboration transparent and reversible.",
    direction: "row",
    visualLabel: "team activity UI",
  },
  {
    eyebrow: "Security & Oversight",
    title: "Visibility for every admin action",
    body: "Exportable audit logs give IT and compliance teams a full record of who accessed what, and when.",
    direction: "row-reverse",
    visualLabel: "audit log UI",
  },
];

export const SECURITY_COLUMNS: SecurityColumn[] = [
  {
    title: "Encryption",
    body: "Data is encrypted at rest and in transit, always.",
    spec: "AES-256 · TLS 1.3",
  },
  {
    title: "Compliance",
    body: "Independently audited against leading standards.",
    spec: "SOC 2 · ISO 27001 · GDPR",
  },
  {
    title: "Access Control",
    body: "SSO, SCIM, and IP allowlisting for every organization.",
    spec: "SAML · SCIM 2.0",
  },
];

export const BENEFITS: StatEntry[] = [
  { value: "99.99%", label: "Uptime SLA" },
  { value: "256-bit", label: "Encryption standard" },
  { value: "<50ms", label: "Average sync latency" },
  { value: "24/7", label: "Enterprise support" },
];

export const INTEGRATIONS = [
  "Slack",
  "Salesforce",
  "Okta",
  "Microsoft 365",
  "Google Workspace",
  "Zoom",
  "Jira",
  "Notion",
  "DocuSign",
  "HubSpot",
  "Zapier",
  "Workday",
];

export const HOME_PRICING_TIERS: PricingTierData[] = [
  {
    name: "Starter",
    price: "$12/user/mo",
    features: ["1TB storage per user", "Basic sharing controls", "Email support"],
    cta: "Start free trial",
    ctaHref: "/register",
    featured: false,
  },
  {
    name: "Business",
    price: "$24/user/mo",
    features: ["Unlimited storage", "Advanced permissions", "SSO & audit logs", "Priority support"],
    cta: "Start free trial",
    ctaHref: "/register",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    features: ["Dedicated SLA", "Data residency options", "Custom contracts"],
    cta: "Contact sales",
    ctaHref: "/enterprise",
    featured: false,
  },
];

export const HOME_TESTIMONIALS: Testimonial[] = [
  {
    company: "GLOBEX LOGISTICS",
    quote:
      "Nextlayer Cloud gave our IT team the controls we needed without slowing our teams down.",
    name: "Dana Ruiz",
    title: "VP of IT, Globex Logistics",
  },
  {
    company: "STELLAR FINANCIAL",
    quote: "The audit logs alone made our compliance review process painless.",
    name: "Marcus Webb",
    title: "Head of Security, Stellar Financial",
  },
];

export const HOME_FAQS: FaqEntry[] = [
  {
    q: "How is my data encrypted?",
    a: "All files are encrypted with AES-256 at rest and TLS 1.3 in transit, with keys managed in dedicated hardware security modules.",
  },
  {
    q: "Can I control who accesses specific folders?",
    a: "Yes — granular, role-based permissions let you control access down to the individual folder or file, with full audit visibility.",
  },
  {
    q: "What happens if I exceed my storage plan?",
    a: "We'll notify your admin before any limits are reached, and you can upgrade or add storage blocks at any time without downtime.",
  },
  {
    q: "Do you support single sign-on (SSO)?",
    a: "Yes, SSO and SCIM provisioning are available on Business and Enterprise plans, supporting all major identity providers.",
  },
  {
    q: "Is there a free trial?",
    a: "Every plan starts with a 14-day free trial, no credit card required.",
  },
  {
    q: "Where is my data stored?",
    a: "Data is stored in redundant, geographically distributed data centers, with regional residency options available for Enterprise customers.",
  },
];

export const COMPARISON = {
  generic: [
    "Bolted-on permissions",
    "Limited audit visibility",
    "Consumer-grade support",
    "Storage tiers that don't scale",
  ],
  nextlayer: [
    "Granular roles built for orgs",
    "Full audit logs, exportable",
    "Dedicated support & SLAs",
    "Storage that scales with you",
  ],
};
