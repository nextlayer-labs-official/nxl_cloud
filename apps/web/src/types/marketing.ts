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

export interface PricingTierData {
  name: string;
  price: string;
  priceNote?: string;
  features: string[];
  cta: string;
  ctaHref: string;
  featured: boolean;
}

export interface FaqEntry {
  q: string;
  a: string;
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

export interface SolutionsSegment {
  id: string;
  label: string;
  headline: string;
  body: string;
  benefits: { title: string; body: string }[];
}
