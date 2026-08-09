import type { NavGroup } from "@/types/navigation";

/**
 * Nav link sets differ by site section in the source design, not globally.
 * Header picks the group by matching the current pathname against `matchPrefixes`
 * (longest match wins), so adding a page later is a one-line config change here,
 * not a prop change on every page.
 *
 * Security, Careers, Resources, and Documentation weren't part of the design
 * export — they're stub "coming soon" pages (see components/marketing/coming-soon.tsx)
 * until real content/design is provided.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "product",
    matchPrefixes: ["/", "/features", "/solutions", "/pricing", "/security"],
    links: [
      { label: "Home", href: "/" },
      { label: "Features", href: "/features" },
      { label: "Solutions", href: "/solutions" },
      { label: "Security", href: "/security" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    id: "resources",
    matchPrefixes: ["/blog", "/faq", "/resources"],
    links: [
      { label: "Home", href: "/" },
      { label: "Features", href: "/features" },
      { label: "Resources", href: "/resources" },
      { label: "Blog", href: "/blog" },
      { label: "About", href: "/about" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    id: "support",
    matchPrefixes: ["/contact"],
    links: [
      { label: "Home", href: "/" },
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    id: "company",
    matchPrefixes: ["/about", "/careers"],
    links: [
      { label: "Home", href: "/" },
      { label: "Features", href: "/features" },
      { label: "Blog", href: "/blog" },
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    id: "partners",
    matchPrefixes: ["/partners"],
    links: [
      { label: "Home", href: "/" },
      { label: "Features", href: "/features" },
      { label: "Solutions", href: "/solutions" },
      { label: "Partners", href: "/partners" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    id: "status",
    matchPrefixes: ["/status", "/documentation"],
    links: [
      { label: "Home", href: "/" },
      { label: "Features", href: "/features" },
      { label: "Documentation", href: "/documentation" },
      { label: "Status", href: "/status" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export function resolveNavGroup(pathname: string): NavGroup {
  let best: NavGroup = NAV_GROUPS[0];
  let bestLength = -1;
  for (const group of NAV_GROUPS) {
    for (const prefix of group.matchPrefixes) {
      const matches = prefix === "/" ? pathname === "/" : pathname.startsWith(prefix);
      if (matches && prefix.length > bestLength) {
        best = group;
        bestLength = prefix.length;
      }
    }
  }
  return best;
}
