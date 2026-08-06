import type { ValueItem, Leader, StatEntry } from "@/types/marketing";

export const VALUES: ValueItem[] = [
  {
    title: "Security first",
    body: "Every decision starts with the question: does this keep customer data safer?",
  },
  {
    title: "Built to last",
    body: "We design for the ten-year relationship, not the quarterly demo.",
  },
  {
    title: "Radical clarity",
    body: "With customers, with each other, about what the product does and doesn't do.",
  },
];

export const LEADERS: Leader[] = [
  { name: "Elena Cross", title: "CEO & Co-founder" },
  { name: "Raj Patel", title: "CTO & Co-founder" },
  { name: "Priya Nair", title: "VP of Security" },
  { name: "Sam Okafor", title: "VP of Product" },
];

export const ABOUT_STATS: StatEntry[] = [
  { value: "2019", label: "Founded" },
  { value: "2,000+", label: "Businesses served" },
  { value: "180", label: "Team members" },
  { value: "$85M", label: "Raised to date" },
];
