import type { SolutionsSegment } from "@/types/marketing";

export const TEAM_SEGMENT_IDS = ["it", "finance", "legal", "marketing"];
export const SIZE_SEGMENT_IDS = ["startups", "mid-market", "enterprise"];
export const DEFAULT_SEGMENT_ID = "mid-market";

export const SEGMENTS: Record<string, SolutionsSegment> = {
  it: {
    id: "it",
    label: "IT",
    headline: "Give IT the control it needs",
    body: "Centralized admin controls, SSO, and full audit visibility mean IT can approve Nextlayer Cloud with confidence.",
    benefits: [
      {
        title: "SSO & SCIM",
        body: "Provision and deprovision users automatically through your identity provider.",
      },
      { title: "Audit logs", body: "Exportable logs of every access and permission change." },
      { title: "Granular roles", body: "Control access down to the individual folder." },
    ],
    quote: "Nextlayer Cloud passed our security review faster than any vendor we've evaluated.",
    quoteName: "Priya Nair",
    quoteTitle: "Director of IT, Vantage Group",
  },
  finance: {
    id: "finance",
    label: "Finance",
    headline: "Keep financial records organized and secure",
    body: "Retention policies and permission controls keep sensitive financial documents compliant and accessible only to those who need them.",
    benefits: [
      {
        title: "Retention policies",
        body: "Set automatic retention rules by folder or file type.",
      },
      { title: "Access restrictions", body: "Limit sensitive folders to named individuals." },
      { title: "Audit trail", body: "Full history for every financial document." },
    ],
    quote: "We finally have one source of truth for every contract and invoice.",
    quoteName: "Tom Everett",
    quoteTitle: "VP Finance, Initech",
  },
  legal: {
    id: "legal",
    label: "Legal",
    headline: "A defensible system of record",
    body: "Version history and audit logs give legal teams the paper trail they need, without sacrificing ease of collaboration.",
    benefits: [
      {
        title: "Version history",
        body: "Unlimited, timestamped history of every document.",
      },
      { title: "Legal holds", body: "Preserve files under review from deletion or edits." },
      { title: "Secure sharing", body: "Password-protected, expiring external links." },
    ],
    quote: "Legal holds and version history alone justified the switch.",
    quoteName: "Sarah Kim",
    quoteTitle: "General Counsel, Umbra Inc.",
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
    quote: "Our creative reviews used to take days. Now they take hours.",
    quoteName: "Jonah Reyes",
    quoteTitle: "Head of Marketing, Stellar Financial",
  },
  startups: {
    id: "startups",
    label: "Startups",
    headline: "Start secure, scale without switching",
    body: "Get enterprise-grade security from day one, with pricing that grows with your team.",
    benefits: [
      { title: "Fast setup", body: "Be up and running in minutes, no IT team required." },
      { title: "Transparent pricing", body: "Pay per user, scale as you grow." },
      { title: "Room to grow", body: "The same platform serves you at 5 people or 500." },
    ],
    quote: "We picked Nextlayer Cloud so we'd never have to migrate later.",
    quoteName: "Alex Chen",
    quoteTitle: "Co-founder, Acme Labs",
  },
  "mid-market": {
    id: "mid-market",
    label: "Mid-Market",
    headline: "Enterprise controls, without enterprise complexity",
    body: "Get the security and admin tools growing companies need, with a setup that doesn't require a dedicated IT team.",
    benefits: [
      {
        title: "Simple admin console",
        body: "Manage users, permissions, and storage from one place.",
      },
      { title: "Predictable pricing", body: "Per-seat pricing that scales cleanly as you grow." },
      { title: "Dedicated support", body: "Real humans, fast response times." },
    ],
    quote: "Nextlayer Cloud scaled with us from 40 to 400 employees without a hitch.",
    quoteName: "Dana Ruiz",
    quoteTitle: "VP of IT, Globex Logistics",
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    headline: "Cloud storage that scales with your organization",
    body: "Custom contracts, dedicated SLAs, and data residency options built for the largest organizations.",
    benefits: [
      { title: "Dedicated SLA", body: "Guaranteed uptime and response times." },
      { title: "Data residency", body: "Choose where your data lives." },
      { title: "Custom contracts", body: "Terms built around your procurement process." },
    ],
    quote: "Our procurement team had zero objections after reviewing Nextlayer's enterprise terms.",
    quoteName: "Marcus Webb",
    quoteTitle: "Head of Security, Stellar Financial",
  },
};
