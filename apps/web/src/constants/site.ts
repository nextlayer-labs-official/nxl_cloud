/**
 * Placeholder production domain — override via NEXT_PUBLIC_SITE_URL once a real
 * domain is assigned. Used for sitemap/robots/OG image URL resolution.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nextlayer.cloud";
export const SITE_NAME = "Nextlayer Cloud";
export const SITE_DESCRIPTION = "Secure cloud storage for modern businesses.";

/** apps/api base URL — override via NEXT_PUBLIC_API_URL in production. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
