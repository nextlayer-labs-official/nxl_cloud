import { prisma } from "@nextlayer/database";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function uniqueOrgSlug(name: string): Promise<string> {
  const baseSlug = slugify(name) || "workspace";
  let slug = baseSlug;
  let suffix = 0;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
  return slug;
}
