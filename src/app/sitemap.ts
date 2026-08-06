import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/site";

const ROUTES = [
  "/",
  "/features",
  "/solutions",
  "/enterprise",
  "/pricing",
  "/about",
  "/blog",
  "/contact",
  "/partners",
  "/faq",
  "/status",
  "/security",
  "/developers",
  "/careers",
  "/resources",
  "/documentation",
  "/privacy",
  "/terms",
  "/login",
  "/register",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
  }));
}
