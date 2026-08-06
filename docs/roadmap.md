# Nextlayer Cloud — Full Roadmap

Status snapshot and remaining phases from marketing site to complete SaaS platform.

## Phase 1 — Marketing Website ✅ Done

All 14 source pages rebuilt in Next.js 15 + Tailwind v4 + shadcn/ui, pixel-matched to the
design export, plus 5 stub pages for nav/footer links that had no source design.

**Loose ends — status:**
- ✅ Removed unused `create-next-app` scaffold files (`public/*.svg`, default `favicon.ico`)
- ✅ Branded favicon (`icon.svg`), `apple-icon`, and Open Graph/Twitter images (generated via
  `next/og`, brand-blue monogram)
- ✅ `sitemap.xml`, `robots.txt`, Organization JSON-LD structured data, `metadataBase` +
  OG/Twitter metadata wired up in the root layout
- ✅ Git initialized, initial commit made (`main` branch)
- ⏳ Responsive breakpoints beyond what the source export had (source only made the nav
  responsive — grids/tables were desktop-only) — not done, deliberately deferred
- ⏳ Automated test coverage — not done, deliberately deferred

Note: `constants/site.ts` has `SITE_URL` set to a placeholder domain
(`https://nextlayer.cloud`) — override via `NEXT_PUBLIC_SITE_URL` once a real production
domain is assigned, since it feeds the sitemap, robots.txt, and OG image URLs.

## Phase 2 — Database & ORM Foundation

Schema design comes before any backend code, since auth, files, and billing all depend on it.

- MySQL 8 instance (local Docker for dev, managed instance for prod)
- Prisma schema: `User`, `Organization`, `Membership`/`Role`, `File`, `Folder`,
  `Permission`, `Session`, `AuditLog`, `Plan`/`Subscription` as a starting model
- Migrations workflow, seed data for local dev

## Phase 3 — Backend API (NestJS)

- Project scaffold: modules, DTOs, validation (class-validator/Zod), global error handling
- Connect to Prisma via a `PrismaModule`
- REST or GraphQL decision (REST is the more conservative default given NestJS's maturity there)
- Environment/config management, logging, health-check endpoint
- API versioning strategy from day one (`/api/v1/...`)

## Phase 4 — Authentication

Built on Phases 2–3. Replaces the current demo-only Login/Register UI with real behavior.

- Credential-based auth (hashed passwords, session or JWT strategy)
- OAuth (Google, Microsoft) — the buttons already exist in the UI, currently inert
- SSO/SAML + SCIM groundwork (mentioned on the Enterprise/Solutions marketing pages —
  worth scoping now even if implementation lands later)
- Password reset flow (the "Forgot password?" link is currently inert)
- Session handling shared between marketing site (logged-out) and portal (logged-in)

## Phase 5 — Wasabi Object Storage Integration

Needed before the portal can do anything real with files.

- Wasabi bucket setup, S3-compatible SDK integration in the NestJS backend
- Upload/download/delete primitives, presigned URLs
- File metadata sync with the `File`/`Folder` Prisma models
- Storage quota tracking (ties into Billing in Phase 7)

## Phase 6 — Customer Portal (Frontend)

This is where every "product UI placeholder" box on the marketing site becomes real.

- App shell separate from the marketing site (likely `app/(portal)/` route group,
  authenticated layout, different nav)
- File browser, previews, upload UI
- Sharing & permissions UI (role-based, matching what Features/Solutions pages promise)
- Team spaces, activity feed, version history
- Admin-facing settings within a user's own org (SSO config, audit log export)

## Phase 7 — Billing & Subscription

Wires the existing Pricing page to real payment logic.

- Stripe (or equivalent) integration: checkout, webhooks, subscription lifecycle
- Plan/seat management tied to the `Plan`/`Subscription` models from Phase 2
- Usage-based storage add-ons (the Pricing page already shows these as line items)
- Invoicing, dunning/failed-payment handling

## Phase 8 — Admin Portal

Internal tooling, separate from the customer-facing portal.

- Org-wide management across all customers (support/ops view)
- Audit log review, impersonation-for-support (with proper guardrails), plan overrides
- Platform-level metrics/dashboards

## Phase 9 — Production Hardening & Launch

Cross-cutting, done incrementally alongside Phases 4–8, but gated before public launch.

- Security review (auth flows, file access controls, dependency audit)
- CI/CD pipeline, staging environment
- Observability: error tracking, logging, uptime monitoring (the Status page currently
  shows static data — this is what would eventually feed it for real)
- Load/performance testing on file upload/download paths
- Accessibility audit across marketing site + portal
