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

## Phase 2 — Database & ORM Foundation ✅ Done

- ✅ Local MySQL (native install, not Docker — Docker wasn't available on this machine)
- ✅ Prisma 7 schema (`prisma/schema.prisma`) covering `User`, `Organization`,
  `Membership`, `Team`/`TeamMembership`, `Folder`, `File`/`FileVersion`, `Permission`,
  `ShareLink`, `Comment`, `AuditLog` (doubles as activity feed), `Session`,
  `Plan`/`Subscription`, `SsoConnection`
- ✅ Initial migration applied (`prisma/migrations/20260806175727_init`)
- ✅ Idempotent seed script (`prisma/seed.ts`) — demo org "Acme Labs" (matches the
  Solutions page testimonial), 3 users, a team, nested folders, an active subscription
- ✅ Prisma Client singleton, using the new v7 driver-adapter architecture
  (`@prisma/adapter-mariadb`) — originally lived at `src/lib/prisma.ts` in the
  single-package layout, relocated to `packages/database/src/index.ts` when Phase 3
  restructured the repo into a monorepo (Next.js no longer touches the DB directly)
- Note: Prisma 7 uses `prisma.config.ts` for the datasource URL (not `schema.prisma`
  directly) and generates the client to a custom output path (gitignored, regenerated
  via `postinstall`) — this differs from older Prisma major versions.
- Note: local MySQL required `127.0.0.1` instead of `localhost` in `DATABASE_URL` — an
  IPv6 resolution quirk with this machine's MySQL build caused `localhost` to fail to
  connect even though the port was reachable.
- Note: Prisma 7's `prisma-client` generator outputs **ESM by default** (uses
  `import.meta.url` internally), which breaks under Node's CJS `require()` — needed
  `moduleFormat = "cjs"` in the generator block once the client had to be consumed
  across a workspace boundary (by `apps/api`) instead of within the same app that
  generates it.

## Phase 3 — Backend API (NestJS) — scaffold ✅ done, real endpoints pending

Repo restructured into an npm-workspaces monorepo: `apps/web` (Next.js, unchanged),
`apps/api` (new NestJS app), `packages/database` (shared Prisma schema/client, now a
proper package with its own `tsc` build step so `apps/api` can `require()` it as
compiled CommonJS rather than raw TypeScript).

- ✅ NestJS 11 scaffold (`apps/api`) — `AppModule`, root controller, ESLint flat config
- ✅ `HealthModule` (`GET /health`) — proves the full chain end-to-end by querying
  `organization.count()` through `@nextlayer/database`; verified returning live data
  from the seeded MySQL database
- ✅ DTOs + validation (`class-validator`, global `ValidationPipe`) — landed with
  Phase 4's auth endpoints (`RegisterDto`, `LoginDto`)
- ⏳ Global exception filter, structured error response shape beyond Nest's default —
  not done
- ⏳ REST vs. GraphQL — still just the conservative REST default, no formal decision made
- ⏳ API versioning strategy (`/api/v1/...`) — not applied yet, only `/` and `/health` exist
- ⏳ Structured logging, request/response interceptors — not done

## Phase 4 — Authentication — credential auth ✅ done, OAuth/SSO pending

- ✅ Credential-based auth: `AuthModule` in `apps/api` (`POST /auth/register`,
  `/auth/login`, `/auth/logout`, `GET /auth/me`), password hashing via Node's built-in
  `crypto.scrypt` (no native-binding dependency, given the environment friction already
  hit with Docker/mysql-cli on this machine)
- ✅ Database-backed sessions (httpOnly, `SameSite=Lax` cookie), using the `Session`
  table from Phase 2 — chosen over JWTs specifically so sessions are instantly
  revocable (logout deletes the row; no blocklist infrastructure needed)
- ✅ Registration also creates the user's `Organization` (from the existing "Company"
  field), an `OWNER` `Membership`, and a 14-day `TRIALING` `Subscription` on the
  Business plan — matching the FAQ's "every plan starts with a 14-day free trial" copy
- ✅ Login/Register pages on the marketing site wired to the real API (previously
  demo-only client state) — verified end-to-end in a real browser: register → account
  created, duplicate email → 409 shown inline, wrong password → 401 shown inline,
  correct login → success
- ⏳ OAuth (Google, Microsoft) — buttons still inert; needs real client ID/secret from
  each provider's developer console before they can be wired up
- ⏳ SSO/SAML + SCIM — deferred until a real enterprise customer/IdP is in scope to
  test against; the `SsoConnection` model from Phase 2 is the placeholder
- ⏳ Password reset flow — the "Forgot password?" link is still inert
- Note: `apps/web` and `apps/api` run on different ports/origins in dev
  (`localhost:3000` / `:3001`) — cookies work because `SameSite=Lax` still permits
  same-site (same host, different port) requests; CORS is configured with an explicit
  origin + `credentials: true` on the API side (a wildcard origin can't be combined
  with credentialed cookies). In production this needs `WEB_ORIGIN` set correctly and
  ideally both apps under the same parent domain.

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
