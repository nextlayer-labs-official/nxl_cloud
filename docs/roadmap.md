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

## Phase 5 — Wasabi Object Storage Integration ✅ done, verified against real Wasabi

- ✅ `StorageService` (`apps/api`) wraps `@aws-sdk/client-s3` +
  `@aws-sdk/s3-request-presigner` — Wasabi is fully S3-compatible, so the standard
  AWS SDK works against it with a custom `endpoint`
- ✅ Upload/download presigned URLs, best-effort delete (storage errors don't block
  DB cleanup — logged, not thrown)
- ✅ **Fully verified against a real Wasabi bucket**: presigned PUT upload,
  byte-exact download round-trip, share-link creation + public resolution, and
  delete (confirmed the object actually disappears from the bucket, not just the
  DB row) — all tested via curl and then again through the real browser UI
  (upload → share → public `/share/[token]` page in a logged-out context)
- ⏳ Storage quota tracking — not done, deferred to Phase 7 (Billing) where it
  actually matters
- Note: real Wasabi credentials require **region-specific endpoints**
  (`s3.<region>.wasabisys.com`, not the generic `s3.wasabisys.com`) — using the
  generic endpoint for a non-`us-east-1` bucket causes auth failures even with
  correct keys.
- Note: a Wasabi **sub-user** API key has zero bucket access by default —
  `AccessDenied` even with a correctly-signed request and a real, existing bucket
  almost always means the sub-user needs a policy attached (Wasabi Console → Users
  → the sub-user → Policies) granting it access to that specific bucket. This is
  separate from the bucket's own ACL/"Quick Settings" (which controls public
  access, not per-user permissions) — don't make the bucket public to work around
  this.

## Phase 6 — Customer Portal (Frontend) — MVP ✅ done

Scoped deliberately to a working core rather than the full roadmap breadth below —
see the "not done" list for what's left.

- ✅ `apps/web/src/app/portal/` — auth-gated shell (`PortalShell`, client-side
  `/auth/me` check, redirects to `/login` on 401), sidebar with workspace card,
  storage-usage indicator, nav, and user/logout
- ✅ File browser: nested folder navigation with full breadcrumb trail, create
  folder, drag-and-drop or button upload (direct-to-Wasabi via presigned URL, live
  per-file progress via XHR), download, per-file share link, delete (files and
  empty folders), org-wide search across files/folders
- ✅ In-app file previews (images, PDF, video/audio, text/code) via a
  `Content-Disposition: inline` presigned URL, separate from the attachment
  download URL
- ✅ `/portal/settings` — profile edit (name/email), password change, and full
  account deletion (cascades and removes all Wasabi objects)
- ✅ Public `/share/[token]` page — resolves a share link with no auth required
- ✅ Login/Register now redirect to `/portal` on success (previously showed static
  "you're logged in" text, since there was nowhere real to send them before this)
- ✅ **Product decision (2026-08-07): personal/solo workspace is the current focus.**
  Company name at registration is now optional (defaults to "{name}'s Workspace"),
  auth-page copy dropped "Work email"/enterprise trust-badge language, and the
  sidebar no longer shows a single-user "Owner" role badge. Team accounts (inviting
  a second person into an org) are explicitly deferred to a later phase — see
  the note on `Membership`/team invites below.
- ✅ Verified end-to-end in a real browser: register → land in empty portal → create
  folder → navigate in/out via breadcrumb → delete folder → logout → confirm direct
  `/portal` access redirects to `/login` when logged out. Upload, download, share,
  and preview all verified against a real Wasabi bucket. Account deletion verified
  against a real throwaway account (renamed, password changed, re-logged-in with
  the new password, deleted, then confirmed the old credentials no longer work).
- ⏳ Comments — schema exists (`Comment` model), no UI
- ⏳ Team accounts / invites — schema (`Membership`, `Team`/`TeamMembership`)
  already supports multiple users per org, but nothing creates a second
  `Membership` on an existing org today; every registration always creates a
  brand-new org. Deliberately deferred until the product has traction — see
  product decision above. Verification mechanism for company accounts (real
  email verification vs. work-domain heuristic vs. manual approval) was
  discussed but not decided.
- ⏳ Activity feed — `AuditLog` isn't even being written to yet by the files/folders
  endpoints (only auth writes one row on registration); needs both the write side
  and a feed UI. Lower priority now given the personal-workspace focus (an
  activity feed matters more once multiple people share a workspace).
- ⏳ Version history UI — `FileVersion` rows are created on upload, but there's no
  UI to view/restore past versions (currently always version 1, since re-uploading
  a same-named file just creates a new `File` row rather than a new version)
- ⏳ Admin console (SSO config, audit log export, org-wide settings) — none of this
  exists yet
- ⏳ Granular per-file/folder `Permission` model — currently every org member has
  full access to everything in their org; the `Permission` table from Phase 2 isn't
  consulted anywhere yet

## Phase 7 — Billing & Subscription — MVP ✅ done, unverified against a real Stripe account

Wires the existing `Plan`/`Subscription` models to real Stripe billing. Built
against the Stripe API per the "no live keys yet" choice (same approach as Wasabi
in Phase 5) — fully wired, but live-verified only once real keys are added.

- ✅ `apps/api/src/billing/` — `BillingService`/`BillingController` using the
  `stripe` SDK (v22). Boots fine with no `STRIPE_SECRET_KEY` set; billing-specific
  endpoints return a clear 503 instead of crashing, mirroring `StorageService`'s
  pattern for missing Wasabi credentials.
- ✅ `GET /billing/plans` — lists `Plan` rows (Starter/Business/Enterprise),
  sorted by price ascending with `null` (Enterprise's "Contact us" custom pricing)
  sorted last
- ✅ `GET /billing/subscription` — current org's subscription + plan
- ✅ `POST /billing/checkout` — creates a Stripe Customer (first time) and a
  Checkout Session using inline `price_data` (no pre-created Stripe Price objects
  needed, since there's no real Stripe account to create them in yet)
- ✅ `POST /billing/portal` — Stripe Billing Portal session for self-serve
  cancel/payment-method/invoice management once a subscription exists — no
  custom cancel/upgrade UI was built, deliberately, since Stripe's hosted portal
  already covers it
- ✅ `POST /billing/webhook` — verifies the Stripe signature (`rawBody: true` set
  on the Nest app specifically for this route) and syncs `Subscription.status`/
  `currentPeriodEnd` on `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, and `invoice.payment_failed`
- ✅ `/portal/settings` — new "Plan & billing" section: current plan/status/renewal
  date, a plan list with "Subscribe" (Starter/Business) or "Contact us" (Enterprise,
  no self-serve price), and "Manage billing" once a Stripe customer exists
- ✅ Verified in a real browser against the demo account: trial subscription reads
  correctly ("Business · Trial · renews ..."), clicking Subscribe surfaces the
  graceful "Billing isn't configured yet" message end-to-end (API → UI) rather
  than failing silently or crashing
- ⏳ **Not yet verified against a real Stripe account** — no live checkout,
  webhook delivery, or portal session has actually been exercised. Needs
  `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` in `.env` (test mode is fine;
  `.env.example` has setup notes, including using `stripe listen` for local
  webhook forwarding) before that's provable.
- ⏳ Usage-based storage add-ons (the Pricing page shows these as line items) —
  not implemented; would need per-org storage-quota enforcement first, which
  Phase 5 explicitly deferred to this phase and still isn't done
- ⏳ Proration on plan switches, dunning/retry sequencing beyond marking
  `PAST_DUE`, invoice history UI (Stripe's customer portal covers viewing past
  invoices today, so this is low-priority)
- ⏳ Marketing Pricing page CTAs are unchanged — they still link to `/register`,
  not directly into checkout; billing is managed from `/portal/settings` after
  the free trial, not from the Pricing page itself

## Phase 8 — Admin Portal

Internal tooling — a **fully separate system** from the customer-facing platform, not
just a gated route inside it. Decided 2026-08-09 after a first attempt (an `/admin`
route inside `apps/web` sharing `apps/api`, gated by a `User.isAdmin` flag) was
deliberately built and then fully removed: reusing the customer app/backend/user
table for platform staff was rejected as the wrong shape — it conflates "customer"
and "staff" in one identity/session/deployment, which real SaaS platforms avoid.

Target shape for whenever this is picked up:

- A separate `apps/admin` frontend and a separate `apps/admin-api` backend, each
  their own deployable process — not routes bolted onto `apps/web`/`apps/api`.
- Its own `AdminUser`/`AdminSession` database models, decoupled from the customer
  `User`/`Session` tables — not a boolean flag on a customer account. Still reads
  the same underlying database (orgs, subscriptions, files) since that's the one
  source of truth, but admin identity and customer identity never share a table,
  a session cookie, or a login form.
- Org-wide management across all customers (support/ops view), plan overrides
- Audit log review, impersonation-for-support (with proper guardrails)
- Platform-level metrics/dashboards

## Phase 9 — Production Hardening & Launch

Cross-cutting, done incrementally alongside Phases 4–8, but gated before public launch.

- Security review (auth flows, file access controls, dependency audit)
- CI/CD pipeline, staging environment
- Observability: error tracking, logging, uptime monitoring (the Status page currently
  shows static data — this is what would eventually feed it for real)
- Load/performance testing on file upload/download paths
- Accessibility audit across marketing site + portal
