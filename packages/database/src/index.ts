import path from "node:path";
import { config } from "dotenv";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client";

// Consumers (apps/api, scripts) may not have loaded the monorepo-root .env
// themselves — do it here so importing { prisma } always just works.
config({ path: path.resolve(__dirname, "../../../.env") });

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Reuse a single instance across hot-reloads to avoid exhausting MySQL's
// connection pool.
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "./generated/prisma/client";
