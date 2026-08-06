export interface NavLink {
  label: string;
  href: string;
}

export interface NavGroup {
  id: string;
  matchPrefixes: string[];
  links: NavLink[];
}
