import type { FeatureRowData } from "@/types/marketing";

/**
 * Note: the source export's data array never actually defines `visualLabel` for
 * these rows (the template references `{{ row.visualLabel }}` but the data omits
 * it) — the values below fill that gap, following the same naming pattern used
 * for every other placeholder box on the site.
 */
export const FEATURE_SECTIONS: FeatureRowData[] = [
  {
    id: "storage",
    navLabel: "Storage",
    eyebrow: "Storage & Preview",
    title: "Storage that scales without friction",
    body: "Unlimited, flexible storage with rich in-browser previews for every file type — no downloads required to check a design or a spreadsheet.",
    points: ["Preview 200+ file formats instantly", "Sync across desktop, web, and mobile"],
    direction: "row",
    visualLabel: "storage / preview UI",
  },
  {
    id: "sharing",
    navLabel: "Sharing",
    eyebrow: "Sharing & Organizations",
    title: "Share within and across your organization",
    body: "Send links internally or externally with expiration dates, password protection, and organization-wide sharing policies.",
    points: ["Org-wide default sharing policies", "Expiring, revocable links"],
    direction: "row-reverse",
    visualLabel: "sharing UI",
  },
  {
    id: "permissions",
    navLabel: "Permissions",
    eyebrow: "Permissions",
    title: "Granular access, down to the folder",
    body: "Role-based permissions mean the right people see the right files — nothing more, nothing less.",
    points: ["Viewer, editor, and admin roles", "Folder-level overrides"],
    direction: "row",
    visualLabel: "permissions UI",
  },
  {
    id: "teams",
    navLabel: "Teams",
    eyebrow: "Teams",
    title: "Shared spaces built for teams",
    body: "Dedicated team spaces keep departmental files organized and separate, while staying easy to navigate company-wide.",
    points: ["Unlimited team spaces", "Cross-team file requests"],
    direction: "row-reverse",
    visualLabel: "team spaces UI",
  },
  {
    id: "version-history",
    navLabel: "Version History",
    eyebrow: "Version History",
    title: "Every change, fully recoverable",
    body: 'Unlimited version history means any file can be rolled back instantly — no more "final_v3_FINAL" files.',
    points: ["Unlimited history on Business+", "One-click restore"],
    direction: "row",
    visualLabel: "version history UI",
  },
  {
    id: "activity",
    navLabel: "Activity",
    eyebrow: "Activity",
    title: "Know what changed, and who changed it",
    body: "A live activity feed surfaces edits, comments, and shares across your organization in real time.",
    points: ["Real-time notifications", "Filter by team or file"],
    direction: "row-reverse",
    visualLabel: "activity feed UI",
  },
  {
    id: "security",
    navLabel: "Security",
    eyebrow: "Security & Audit Logs",
    title: "Enterprise-grade security by default",
    body: "AES-256 encryption, SSO, and exportable audit logs give IT full oversight without slowing teams down.",
    points: ["Exportable audit logs", "SSO & SCIM provisioning"],
    direction: "row",
    visualLabel: "audit log UI",
  },
];
