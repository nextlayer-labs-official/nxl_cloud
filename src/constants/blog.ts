import type { BlogPost, BlogCategory } from "@/types/marketing";

export const FEATURED_POST = {
  category: "PRODUCT",
  title: "Introducing granular audit log exports",
  excerpt: "A new API endpoint gives admins full, filterable access to organization activity.",
  author: "Priya Nair",
  date: "Aug 2, 2026",
  readTime: "5 min read",
};

export const BLOG_CATEGORIES: BlogCategory[] = [
  { id: "all", label: "All" },
  { id: "product", label: "Product" },
  { id: "company", label: "Company" },
  { id: "industry", label: "Industry" },
  { id: "security", label: "Security" },
];

export const BLOG_POSTS: BlogPost[] = [
  {
    title: "How we built our SOC 2 audit pipeline",
    category: "SECURITY",
    catId: "security",
    author: "Marcus Webb",
    date: "Jul 28, 2026",
    readTime: "6 min",
  },
  {
    title: "5 ways teams reduce version chaos",
    category: "PRODUCT",
    catId: "product",
    author: "Dana Ruiz",
    date: "Jul 20, 2026",
    readTime: "4 min",
  },
  {
    title: "Nextlayer Cloud raises Series C",
    category: "COMPANY",
    catId: "company",
    author: "Nextlayer Team",
    date: "Jul 10, 2026",
    readTime: "3 min",
  },
  {
    title: "The hidden cost of consumer cloud storage at work",
    category: "INDUSTRY",
    catId: "industry",
    author: "Tom Everett",
    date: "Jun 30, 2026",
    readTime: "7 min",
  },
];
