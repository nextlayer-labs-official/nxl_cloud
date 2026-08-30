import type { NavGroup } from "@/types/navigation";

/**
 * One consistent nav across every marketing page — previously split into
 * several page-specific groups, but most of that differentiation existed to
 * route around now-deleted stub pages (blog, status, careers, resources,
 * documentation, security). `resolveNavGroup` is kept as the lookup so
 * `Header` doesn't need to change, but there's just one group to resolve to
 * now.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "main",
    matchPrefixes: [""],
    links: [
      { label: "Features", href: "/features" },
      { label: "Solutions", href: "/solutions" },
      { label: "Partners", href: "/partners" },
      { label: "Pricing", href: "/pricing" },
      { label: "About", href: "/about" },
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
