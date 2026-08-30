import type { SolutionsSegment } from "@/types/marketing";

export const TEAM_SEGMENT_IDS = ["it", "finance", "legal", "marketing"];
export const SIZE_SEGMENT_IDS = ["startups", "mid-market", "enterprise"];
export const DEFAULT_SEGMENT_ID = "mid-market";

export const SEGMENTS: Record<string, SolutionsSegment> = {
  it: {
    id: "it",
    label: "IT",
    headline: "Give IT the control it needs",
    body: "Centralized admin controls and a full audit trail mean IT can approve Nextlayer Cloud with confidence.",
    benefits: [
      { title: "Admin console", body: "Manage members, plans, and storage from one place." },
      { title: "Audit trail", body: "A complete record of every access and permission change." },
      { title: "Granular roles", body: "Control access down to the individual folder." },
    ],
  },
  finance: {
    id: "finance",
    label: "Finance",
    headline: "Keep financial records organized and secure",
    body: "Permission controls keep sensitive financial documents accessible only to those who need them.",
    benefits: [
      { title: "Folder-level access", body: "Restrict sensitive folders to named individuals." },
      { title: "Version history", body: "Every change to every document, fully recoverable." },
      { title: "Audit trail", body: "Full history for every financial document." },
    ],
  },
  legal: {
    id: "legal",
    label: "Legal",
    headline: "A defensible system of record",
    body: "Version history and audit trails give legal teams the paper trail they need, without sacrificing ease of collaboration.",
    benefits: [
      { title: "Version history", body: "Unlimited, timestamped history of every document." },
      { title: "Access control", body: "Down to the individual folder, viewer or editor." },
      { title: "Secure sharing", body: "Password-protected, expiring external links." },
    ],
  },
  marketing: {
    id: "marketing",
    label: "Marketing",
    headline: "Move campaigns faster, together",
    body: "Shared team spaces and rich previews mean creative and marketing teams can collaborate without email attachments.",
    benefits: [
      { title: "Rich previews", body: "Preview design files, videos, and decks instantly." },
      { title: "Shared spaces", body: "One space per campaign or brand." },
      { title: "External sharing", body: "Share polished assets with agencies and partners." },
    ],
  },
  startups: {
    id: "startups",
    label: "Startups",
    headline: "Start secure, scale without switching",
    body: "Get real access control and an audit trail from day one, on a plan that fits your team's size.",
    benefits: [
      { title: "Fast setup", body: "Be up and running in minutes, no IT team required." },
      { title: "Plans that scale", body: "Move up a plan as your storage needs grow." },
      { title: "Room to grow", body: "The same platform works at 5 people or 500." },
    ],
  },
  "mid-market": {
    id: "mid-market",
    label: "Mid-Market",
    headline: "Enterprise controls, without enterprise complexity",
    body: "Get the access control and admin tools growing companies need, with a setup that doesn't require a dedicated IT team.",
    benefits: [
      { title: "Simple admin console", body: "Manage users, permissions, and storage from one place." },
      { title: "Predictable pricing", body: "Per-organization plans, not per-seat surprises." },
      { title: "Reseller-friendly", body: "Buy through a partner if that's how you already procure software." },
    ],
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    headline: "Cloud storage that scales with your organization",
    body: "Storage plans and admin controls built to grow with larger organizations.",
    benefits: [
      { title: "Admin overrides", body: "Custom storage limits and pricing, set by your account admin." },
      { title: "Full audit trail", body: "A complete record of every access and permission change." },
      { title: "Partner billing", body: "Manage billing through a reseller if that fits your procurement process." },
    ],
  },
};
