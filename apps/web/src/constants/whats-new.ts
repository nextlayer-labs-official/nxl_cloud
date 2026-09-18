export type ChangelogPlatform = "web" | "desktop";

export interface ChangelogSection {
  heading: string;
  items: string[];
}

export interface ChangelogEntry {
  id: string;
  date: string; // ISO date.
  platform: ChangelogPlatform;
  title: string;
  sections: ChangelogSection[];
}

/**
 * Real, shipped changes only — in reverse-chronological order. Add a new
 * entry here whenever something customer-facing ships; this page only
 * stays worth having if it's kept current.
 */
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    id: "2026-09-18-trial-status",
    date: "2026-09-18",
    platform: "web",
    title: "Trial status and automatic Trash cleanup",
    sections: [
      {
        heading: "New Features",
        items: [
          "Trash items are now deleted automatically after 7 days — you can still restore or permanently delete anything sooner.",
        ],
      },
      {
        heading: "Improvements",
        items: ["Ended trials and plans now show clearly in the sidebar and on the Plan & Billing page."],
      },
    ],
  },
  {
    id: "2026-09-14-activity-history",
    date: "2026-09-14",
    platform: "web",
    title: "Richer file activity history",
    sections: [
      {
        heading: "Improvements",
        items: ["Uploads and downloads now record the file name, size, and type in the Activity tab."],
      },
    ],
  },
  {
    id: "2026-09-08-rebrand",
    date: "2026-09-08",
    platform: "web",
    title: "We're now Skylyer",
    sections: [
      {
        heading: "New Features",
        items: ["New name, same team and product — nothing about your account, files, or plan changes."],
      },
    ],
  },
  {
    id: "2026-08-16-sharing-move-starred",
    date: "2026-08-16",
    platform: "web",
    title: "Sharing, Move, Recent, Starred, and activity",
    sections: [
      {
        heading: "New Features",
        items: [
          "Share files and folders with anyone by email, including people who don't have an account yet.",
          "Request access to anything shared with you that you can't open.",
          "Move files and folders anywhere in your workspace.",
          "Star the files and folders you use most, and jump back into Recent.",
          "See the full activity history for any file or folder.",
        ],
      },
    ],
  },
  {
    id: "2026-08-14-free-trial",
    date: "2026-08-14",
    platform: "web",
    title: "Free trial on every plan",
    sections: [
      {
        heading: "New Features",
        items: ["Every new plan starts with a full trial period before you're asked to pay — no credit card required."],
      },
    ],
  },
  {
    id: "2026-08-09-self-serve-plans",
    date: "2026-08-09",
    platform: "web",
    title: "Change or cancel your plan anytime",
    sections: [
      {
        heading: "New Features",
        items: ["Upgrade instantly, or schedule a downgrade for your next renewal — entirely self-serve from Plan & Billing."],
      },
    ],
  },
  {
    id: "2026-08-08-trash-folder-sharing",
    date: "2026-08-08",
    platform: "web",
    title: "Trash and folder sharing",
    sections: [
      {
        heading: "New Features",
        items: [
          "Deleted items now go to Trash instead of disappearing outright.",
          "Sharing now works on entire folders, not just individual files.",
        ],
      },
    ],
  },
  {
    id: "2026-08-07-in-app-previews",
    date: "2026-08-07",
    platform: "web",
    title: "In-app previews",
    sections: [
      {
        heading: "New Features",
        items: ["Open images, PDFs, video, and audio right in the browser — no download required just to take a look."],
      },
    ],
  },
];
