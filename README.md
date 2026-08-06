# Nextlayer Cloud

Monorepo for the Nextlayer Cloud platform.

## Structure

```
apps/
  web/          Next.js 15 marketing site (App Router, Tailwind v4, shadcn/ui)
  api/          NestJS backend API
packages/
  database/     Shared Prisma schema + generated client (MySQL), consumed by apps/api
docs/
  migration-plan.md   How the marketing site was rebuilt from the design export
  roadmap.md          Full phase-by-phase plan through the complete SaaS platform
```

`apps/web` does not talk to the database directly — all data access goes through
`apps/api`, which imports the shared client from `@nextlayer/database`.

## Prerequisites

- Node.js 20.19+
- A local MySQL instance (see `.env.example` for the expected connection format)

## Setup

```bash
npm install                # installs all workspaces, generates + builds the Prisma client
cp .env.example .env       # then fill in your MySQL connection details
npm run db:migrate         # apply migrations
npm run db:seed            # seed demo data
```

## Development

```bash
npm run dev:web            # Next.js on http://localhost:3000
npm run dev:api            # NestJS on http://localhost:3001
```

## Database

The Prisma schema lives in `packages/database/prisma/schema.prisma`. Common commands
(run from the repo root):

```bash
npm run db:generate        # regenerate the Prisma client after a schema change
npm run db:migrate         # create + apply a migration
npm run db:seed            # re-run the seed script
npm run db:studio          # open Prisma Studio
```

## Linting & Formatting

```bash
npm run lint                # lints every workspace
npm run format               # Prettier, whole repo
npm run format:check
```
