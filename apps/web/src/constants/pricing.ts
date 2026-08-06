import type { RawPricingTier, PricingTableRow, Addon, FaqEntry } from "@/types/marketing";

export const PRICING_TIERS: RawPricingTier[] = [
  {
    name: "Starter",
    monthly: "$12",
    yearly: "$10",
    features: ["1TB storage per user", "Basic sharing controls", "Email support"],
    cta: "Start free trial",
    ctaHref: "/register",
    featured: false,
  },
  {
    name: "Business",
    monthly: "$24",
    yearly: "$19",
    features: ["Unlimited storage", "Advanced permissions", "SSO & audit logs", "Priority support"],
    cta: "Start free trial",
    ctaHref: "/register",
    featured: true,
  },
  {
    name: "Enterprise",
    monthly: "Custom",
    yearly: "Custom",
    features: ["Dedicated SLA", "Data residency options", "Custom contracts"],
    cta: "Contact sales",
    ctaHref: "/enterprise",
    featured: false,
  },
];

export const PRICING_TABLE_ROWS: PricingTableRow[] = [
  { isGroup: true, label: "Storage" },
  { label: "Storage per user", starter: "1TB", business: "Unlimited", enterprise: "Unlimited" },
  {
    label: "File versioning",
    starter: "30 days",
    business: "Unlimited",
    enterprise: "Unlimited",
  },
  { isGroup: true, label: "Collaboration" },
  { label: "Team spaces", starter: "3", business: "Unlimited", enterprise: "Unlimited" },
  { label: "Activity feed", starter: "—", business: "✓", enterprise: "✓" },
  { isGroup: true, label: "Security" },
  { label: "SSO / SCIM", starter: "—", business: "✓", enterprise: "✓" },
  { label: "Audit log export", starter: "—", business: "✓", enterprise: "✓" },
  { label: "Data residency", starter: "—", business: "—", enterprise: "Custom" },
  { isGroup: true, label: "Support" },
  {
    label: "Support level",
    starter: "Email",
    business: "Priority",
    enterprise: "Dedicated + SLA",
  },
];

export const ADDONS: Addon[] = [
  { name: "Extra storage block", desc: "+1TB pooled storage", price: "$8/mo" },
  {
    name: "Advanced audit retention",
    desc: "Extend audit log retention to 7 years",
    price: "$15/mo",
  },
];

export const PRICING_FAQS: FaqEntry[] = [
  {
    q: "Can I change plans later?",
    a: "Yes, you can upgrade, downgrade, or change your billing cycle at any time from your account settings.",
  },
  {
    q: "What happens after the free trial?",
    a: "You'll be prompted to choose a paid plan. No charges occur automatically without your confirmation.",
  },
  {
    q: "How does per-seat billing work?",
    a: "You're billed monthly or annually based on the number of active user seats, prorated for mid-cycle changes.",
  },
  {
    q: "Do you offer discounts for nonprofits or education?",
    a: "Yes — contact sales for eligibility and pricing for nonprofit and education organizations.",
  },
];
