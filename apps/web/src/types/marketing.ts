export interface FeatureRowData {
  id?: string;
  navLabel?: string;
  eyebrow: string;
  title: string;
  body: string;
  direction: "row" | "row-reverse";
  visualLabel: string;
  points?: string[];
}

export interface SecurityColumn {
  title: string;
  body: string;
  spec: string;
}

export interface StatEntry {
  value: string;
  label: string;
}

export interface PricingTierData {
  name: string;
  price: string;
  priceNote?: string;
  features: string[];
  cta: string;
  ctaHref: string;
  featured: boolean;
}

export interface Testimonial {
  company: string;
  quote: string;
  name: string;
  title: string;
}

export interface FaqEntry {
  q: string;
  a: string;
}

export interface RawPricingTier {
  name: string;
  monthly: string;
  yearly: string;
  features: string[];
  cta: string;
  ctaHref: string;
  featured: boolean;
}

export type PricingTableRow =
  | { isGroup: true; label: string }
  | { isGroup?: false; label: string; starter: string; business: string; enterprise: string };

export interface Addon {
  name: string;
  desc: string;
  price: string;
}

export interface BlogPost {
  title: string;
  category: string;
  catId: string;
  author: string;
  date: string;
  readTime: string;
}

export interface BlogCategory {
  id: string;
  label: string;
}

export interface ContactIntent {
  id: string;
  label: string;
  emailLabel: string;
  messageLabel: string;
  altContact: string;
  showCompany: boolean;
}

export interface ValueItem {
  title: string;
  body: string;
}

export interface Leader {
  name: string;
  title: string;
}

export interface EnterpriseCapability {
  title: string;
  body: string;
}

export interface SolutionsSegment {
  id: string;
  label: string;
  headline: string;
  body: string;
  benefits: { title: string; body: string }[];
  quote: string;
  quoteName: string;
  quoteTitle: string;
}
