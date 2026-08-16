import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

// Duplicated from apps/api/src/auth/password.util.ts on purpose — this package
// doesn't depend on apps/api, and the format (salt:hex via scrypt) just needs
// to match what AdminAuthService.login verifies against.
const scrypt = promisify(scryptCallback);
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function main() {
  // Plans — mirror the 3 Pricing page tiers exactly.
  const [starter, business, enterprise] = await Promise.all([
    prisma.plan.upsert({
      where: { name: "Starter" },
      update: {},
      create: {
        name: "Starter",
        priceMonthlyCents: 1200,
        priceYearlyCents: 1000,
        storageLimitGb: 1024,
        features: ["1TB storage per user", "Basic sharing controls", "Email support"],
      },
    }),
    prisma.plan.upsert({
      where: { name: "Business" },
      update: {},
      create: {
        name: "Business",
        priceMonthlyCents: 2400,
        priceYearlyCents: 1900,
        storageLimitGb: null,
        features: [
          "Unlimited storage",
          "Advanced permissions",
          "SSO & audit logs",
          "Priority support",
        ],
      },
    }),
    prisma.plan.upsert({
      where: { name: "Enterprise" },
      update: {},
      create: {
        name: "Enterprise",
        priceMonthlyCents: null,
        priceYearlyCents: null,
        storageLimitGb: null,
        features: ["Dedicated SLA", "Data residency options", "Custom contracts"],
      },
    }),
  ]);

  // Demo organization — "Acme Labs" matches the Solutions page testimonial
  // (Alex Chen, Co-founder, Acme Labs) for continuity with the marketing site.
  const org = await prisma.organization.upsert({
    where: { slug: "acme-labs" },
    update: {},
    create: { name: "Acme Labs", slug: "acme-labs" },
  });

  const owner = await prisma.user.upsert({
    where: { email: "alex@acmelabs.example" },
    update: {},
    create: { email: "alex@acmelabs.example", name: "Alex Chen" },
  });
  const admin = await prisma.user.upsert({
    where: { email: "jordan@acmelabs.example" },
    update: {},
    create: { email: "jordan@acmelabs.example", name: "Jordan Lee" },
  });
  const member = await prisma.user.upsert({
    where: { email: "sam@acmelabs.example" },
    update: {},
    create: { email: "sam@acmelabs.example", name: "Sam Rivera" },
  });

  await Promise.all([
    prisma.membership.upsert({
      where: { userId_organizationId: { userId: owner.id, organizationId: org.id } },
      update: {},
      create: { userId: owner.id, organizationId: org.id, role: "OWNER" },
    }),
    prisma.membership.upsert({
      where: { userId_organizationId: { userId: admin.id, organizationId: org.id } },
      update: {},
      create: { userId: admin.id, organizationId: org.id, role: "ADMIN" },
    }),
    prisma.membership.upsert({
      where: { userId_organizationId: { userId: member.id, organizationId: org.id } },
      update: {},
      create: { userId: member.id, organizationId: org.id, role: "MEMBER" },
    }),
  ]);

  const designTeam = await prisma.team.upsert({
    where: { id: `${org.id}-design-team` },
    update: {},
    create: { id: `${org.id}-design-team`, organizationId: org.id, name: "Design" },
  });
  await prisma.teamMembership.upsert({
    where: { userId_teamId: { userId: member.id, teamId: designTeam.id } },
    update: {},
    create: { userId: member.id, teamId: designTeam.id },
  });

  const marketingFolder = await prisma.folder.upsert({
    where: { id: `${org.id}-marketing-assets` },
    update: {},
    create: {
      id: `${org.id}-marketing-assets`,
      organizationId: org.id,
      teamId: designTeam.id,
      name: "Marketing Assets",
      createdById: owner.id,
    },
  });
  await prisma.folder.upsert({
    where: { id: `${org.id}-q3-campaign` },
    update: {},
    create: {
      id: `${org.id}-q3-campaign`,
      organizationId: org.id,
      teamId: designTeam.id,
      parentId: marketingFolder.id,
      name: "Q3 Campaign",
      createdById: member.id,
    },
  });

  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      planId: business.id,
      status: "ACTIVE",
      billingCycle: "ANNUAL",
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      actorId: owner.id,
      action: "organization.created",
      targetType: "Organization",
      targetId: org.id,
    },
  });

  const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? "Admin12345";
  const adminUser = await prisma.adminUser.upsert({
    where: { email: "admin@nextlayer.cloud" },
    update: {},
    create: {
      email: "admin@nextlayer.cloud",
      name: "Platform Admin",
      passwordHash: await hashPassword(adminPassword),
    },
  });

  console.log("Seeded:", {
    plans: [starter.name, business.name, enterprise.name],
    organization: org.name,
    users: [owner.email, admin.email, member.email],
    adminUser: adminUser.email,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
