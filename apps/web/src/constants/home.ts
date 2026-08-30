import type { FeatureRowData, SecurityColumn, FaqEntry } from "@/types/marketing";

export const FEATURE_ROWS: FeatureRowData[] = [
  {
    eyebrow: "Storage",
    title: "Unlimited flexibility, zero clutter",
    body: "Rich file previews and a familiar folder view keep every team member working from the same source of truth.",
    direction: "row",
    visualLabel: "storage / preview UI",
  },
  {
    eyebrow: "Sharing & Permissions",
    title: "Share confidently, control precisely",
    body: "Share a file or folder directly with someone's email as a viewer or editor, or generate a link — password-protected and revocable anytime.",
    direction: "row-reverse",
    visualLabel: "permissions UI",
  },
  {
    eyebrow: "Teams",
    title: "Built for how teams actually work",
    body: "Shared team spaces, a live activity feed, and full version history make collaboration transparent and reversible.",
    direction: "row",
    visualLabel: "team activity UI",
  },
  {
    eyebrow: "Security & Oversight",
    title: "Visibility for every admin action",
    body: "A full audit trail gives admins a record of who accessed, shared, or changed what, and when.",
    direction: "row-reverse",
    visualLabel: "audit log UI",
  },
];

export const SECURITY_COLUMNS: SecurityColumn[] = [
  {
    title: "Encryption",
    body: "Every connection to Nextlayer Cloud runs over HTTPS/TLS.",
    spec: "TLS in transit",
  },
  {
    title: "Access control",
    body: "Viewer and editor roles, folder-level overrides, and links that expire or need a password.",
    spec: "Per-resource permissions",
  },
  {
    title: "Isolation",
    body: "Customer, admin, and partner logins are entirely separate systems — no shared sessions.",
    spec: "3 independent auth systems",
  },
];

export const HOME_FAQS: FaqEntry[] = [
  {
    q: "Is my data encrypted in transit?",
    a: "Yes — all traffic to and from Nextlayer Cloud runs over HTTPS/TLS.",
  },
  {
    q: "Can I control who accesses specific folders?",
    a: "Yes — share a file or folder directly with a viewer or editor role, down to the individual folder, with a full activity trail.",
  },
  {
    q: "What happens if I exceed my storage plan?",
    a: "Uploads that would push you over your plan's limit are blocked with a clear message — no automatic overage charges. Delete files or upgrade to continue.",
  },
  {
    q: "Is there a free trial?",
    a: "New plans can start on a trial period with no credit card required — check the specific plan on our pricing page.",
  },
  {
    q: "Can a reseller manage billing for their own customers?",
    a: "Yes — our partner program gives resellers their own portal to manage pricing and plans for the customers they bring on.",
  },
];

export const COMPARISON = {
  generic: [
    "Bolted-on permissions",
    "Limited audit visibility",
    "One-size-fits-all support",
    "Storage tiers that don't scale",
  ],
  nextlayer: [
    "Granular roles built for orgs",
    "A full audit trail",
    "Direct answers, not ticket queues",
    "Storage that scales with you",
  ],
};
