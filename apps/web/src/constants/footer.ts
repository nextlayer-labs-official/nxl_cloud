import type { FooterColumn } from "@/types/footer";

/**
 * Full footer's link columns (Home only). Security, Documentation, Careers, and
 * Resources are stub "coming soon" pages — see components/marketing/coming-soon.tsx.
 */
export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Solutions", href: "/solutions" },
      { label: "Pricing", href: "/pricing" },
      { label: "Security", href: "/security" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Resources", href: "/resources" },
      { label: "Log in", href: "/login" },
    ],
  },
];

export const DEFAULT_COPYRIGHT = "© 2026 Nextlayer Labs. All rights reserved.";
