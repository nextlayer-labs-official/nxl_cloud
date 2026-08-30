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
    body: "Flexible storage with rich in-browser previews for every file type — no downloads required to check a design or a spreadsheet.",
    points: ["In-browser previews for common file types", "Accessible from any browser, on any device"],
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
    points: ["Viewer and editor roles", "Folder-level overrides"],
    direction: "row",
    visualLabel: "permissions UI",
  },
  {
    id: "teams",
    navLabel: "Teams",
    eyebrow: "Teams",
    title: "Shared spaces built for teams",
    body: "Dedicated team spaces keep departmental files organized and separate, while staying easy to navigate company-wide.",
    points: ["Unlimited team spaces", "Easy to navigate company-wide"],
    direction: "row-reverse",
    visualLabel: "team spaces UI",
  },
  {
    id: "version-history",
    navLabel: "Version History",
    eyebrow: "Version History",
    title: "Every change, fully recoverable",
    body: 'Unlimited version history means any file can be rolled back instantly — no more "final_v3_FINAL" files.',
    points: ["Unlimited version history", "One-click restore"],
    direction: "row",
    visualLabel: "version history UI",
  },
  {
    id: "activity",
    navLabel: "Activity",
    eyebrow: "Activity",
    title: "Know what changed, and who changed it",
    body: "A complete activity feed surfaces edits, shares, and permission changes across your organization.",
    points: ["Every share and permission change logged", "Filter by organization member"],
    direction: "row-reverse",
    visualLabel: "activity feed UI",
  },
  {
    id: "security",
    navLabel: "Security",
    eyebrow: "Security & Audit Logs",
    title: "Enterprise-grade security by default",
    body: "TLS encryption in transit and a full audit trail give IT the oversight they need without slowing teams down.",
    points: ["Complete audit trail of every action", "Separate customer, admin, and partner logins"],
    direction: "row",
    visualLabel: "audit log UI",
  },
];
