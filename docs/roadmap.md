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
- ✅ Storage quota tracking and enforcement — see Phase 8's admin-panel note;
  landed 2026-08-09 once billing/admin had a place to configure limits
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
  per-file progress via XHR), download, per-file/folder share link, delete (files
  and empty folders), org-wide search across files/folders
- ✅ Share link lifecycle — creating a share link is idempotent (reuses the
  existing active link for that resource instead of minting a new token every
  time "Share" is clicked, via `share-link.util.ts` shared by
  `files.service.ts`/`folders.service.ts`), a "Stop sharing" action in the
  same modal revokes it (`DELETE /files|folders/:id/share`), and a small
  link icon next to the file/folder name in the browser (both the main view
  and search results) shows which items currently have an active share link
  — previously there was no way to tell a resource was shared, or to un-share
  it, short of going into the database directly.
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

## Phase 7 — Billing & Subscription — MVP ✅ done (Razorpay), verified against a real test account

Wires the existing `Plan`/`Subscription` models to real billing. Originally built
against Stripe; replaced with **Razorpay** on 2026-08-09 since the platform sells
in India (INR pricing — see Phase 8's ₹ note) and Razorpay is the natural fit for
UPI/cards there.

- ✅ `apps/api/src/billing/` — `BillingService`/`BillingController` using the
  `razorpay` SDK. Boots fine with no `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` set;
  billing-specific endpoints return a clear 503 instead of crashing, mirroring
  `StorageService`'s pattern for missing Wasabi credentials.
- **Deliberate design choice: one-time charge per billing period (Razorpay
  Orders API), not the Subscriptions API.** Razorpay auto-billing (mandates,
  recurring auth-transactions) is meaningfully more moving parts than Stripe's
  equivalent; renewal/expiry instead lives in `Subscription.currentPeriodEnd`,
  which the admin panel can already view and edit directly (see Phase 8). No
  hosted self-serve billing portal either — Razorpay has no direct equivalent
  to Stripe's Billing Portal, so cancel/plan-change is admin-handled (also
  Phase 8) rather than self-serve, at least for this pass.
- ✅ `GET /billing/plans` — unchanged: lists `Plan` rows, sorted by price
  ascending with `null` (Enterprise's "Contact us" custom pricing) sorted last
- ✅ `GET /billing/subscription` — current org's subscription + plan
- ✅ `POST /billing/order` — creates a Razorpay Order for the selected plan at
  the chosen billing cycle's price (paise), with
  `notes: { organizationId, planId, billingCycle }` stored on the order itself
  — the source of truth read back during verification, not trusted from the
  client. `receipt` is a short random hex string, not an encoded org id —
  Razorpay caps `receipt` at 40 chars, which the first version of this blew
  past and got a 400 from Razorpay (`receipt: the length must be no more than
  40`) the first time it was exercised against a real account.
- ✅ `POST /billing/verify` — the frontend calls this immediately after the
  Razorpay Checkout popup succeeds, passing back
  `razorpay_order_id`/`razorpay_payment_id`/`razorpay_signature`. Verifies the
  signature server-side via the SDK's `validatePaymentVerification`, re-fetches
  the order to read its `notes` (never trusts a client-supplied planId), then
  activates the subscription (`status: ACTIVE`, `currentPeriodEnd` extended by
  the billing cycle length).
- ✅ `POST /billing/webhook` — verifies the Razorpay signature (`x-razorpay-signature`
  header, `rawBody: true` already enabled globally in `main.ts`) via the SDK's
  `validateWebhookSignature`, and handles `payment.captured` (backup activation
  path in case the client-side verify call never fires) and `payment.failed`
  (marks `PAST_DUE`)
- ✅ `Payment` model + `GET /billing/transactions` — one row per successfully
  activated payment (amount, plan, billing cycle, timestamp), written inside
  the same DB transaction as the `Subscription` upsert in `activateSubscription`
  (shared by both the verify and webhook paths). Guarded by a
  `razorpayPaymentId`-keyed idempotency check first — both paths can fire for
  the same payment (client-side verify races the webhook), and without the
  guard the second write would hit `Payment.razorpayPaymentId`'s unique
  constraint and 500. Surfaced on `/portal/settings` as "Transaction history"
  under the plan list.
- ✅ Monthly/Annual toggle on `/portal/settings` — previously checkout was
  hardcoded to `billingCycle: "MONTHLY"` with no yearly price ever shown or
  selectable, even though `Plan.priceYearlyCents` existed. Now a pill toggle
  (styled like the marketing Pricing page's) switches both the displayed price
  and what `POST /billing/order` requests.
- ✅ **Verified against a real Razorpay test account** (test-mode
  `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` added to `.env`): `POST /billing/order`
  creates a real order, clicking "Subscribe" in the browser opens the actual
  Razorpay Checkout iframe with a live session token, and a validly-signed
  `POST /billing/verify` call (signature computed the same way Razorpay itself
  would, after fixing the `receipt` bug above) correctly activates the
  subscription and writes a `Payment` row that shows up in the transaction
  history UI. A full human-in-the-loop card payment (entering test card details
  inside Razorpay's iframe) was not exercised. `RAZORPAY_WEBHOOK_SECRET` in
  `.env` is currently an empty placeholder — the webhook path is unverified,
  but non-blocking since it's only the defensive backup to client-side verify.
- ⏳ Usage-based storage add-ons (the Pricing page shows these as line items) —
  still not implemented as a self-serve purchase flow, though the underlying
  per-org storage-quota enforcement it would need now exists (Phase 8)
- ✅ Upgrade/downgrade mid-cycle (2026-08-09) — previously switching to *any*
  other plan, higher or lower, went through the same path: full price charged
  immediately, plan switched immediately, `currentPeriodEnd` reset to a fresh
  period from today — silently discarding whatever paid time was left on the
  old plan, with no distinction between upgrading and downgrading. Deliberately
  **not** full proration (no partial-period credit/charge math, no mid-cycle
  refunds) — a simpler rule instead:
  - **Upgrades** (`Plan.priceMonthlyCents` higher than the current plan's):
    unchanged — immediate, full price, right away.
  - **Downgrades**: no charge and no immediate switch. `POST /billing/order`
    detects it (existing subscription is `ACTIVE` with a future
    `currentPeriodEnd` and the target plan is cheaper) and instead stores
    `Subscription.pendingPlanId`/`pendingBillingCycle`, returning
    `{ scheduled: true, effectiveDate, planName }` — the frontend shows
    "Downgrade scheduled" and never opens the Razorpay checkout. The org keeps
    its current (already-paid-for) plan until `currentPeriodEnd`.
  - Since this app has no cron/job scheduler, the switch isn't pushed by a
    background job — `applyDuePendingChange()` (`billing/subscription-lifecycle
    .util.ts`) applies it lazily, the next time the subscription is actually
    read (`getSubscription`, admin's `getOrganization`), once
    `currentPeriodEnd` has passed. No new charge happens at that point either
    — the org would need to actively resubscribe/renew like anyone else, same
    as this app already works for everyone (there's no auto-billing engine).
  - A pending downgrade is superseded by whatever supersedes it: a fresh
    purchase (`activateSubscription` clears `pendingPlanId` on any new
    payment), an explicit customer cancel (`POST /billing/cancel-pending-change`,
    a "Cancel" link next to "Switching to X on renewal" in
    `/portal/settings`), or an admin override (`AdminService.updateSubscription`
    always clears it — a direct admin decision wins over a queued one).
  - Surfaced in the admin organizations list (`Pro → Plus on renewal`) and org
    detail page too, not just the customer's own settings page.
  - Verified end-to-end: downgrade request returns `scheduled: true` with no
    Razorpay order created; upgrade request (even with paid time remaining)
    still returns a real order; canceling a pending downgrade restores the
    normal "Subscribe" button; backdating `currentPeriodEnd` and re-fetching
    the subscription correctly auto-applies the pending plan; admin override
    clears a pending downgrade.
- ✅ Self-serve renewal (2026-08-09) — there was no automated renewal to begin
  with (no cron, no Razorpay Subscriptions — see the design note above), which
  is fine by design, but the customer's own current plan's button was
  permanently disabled ("Current plan"), so there was **no way for anyone to
  renew at all**, self-serve or otherwise, once a period lapsed — only an
  admin manually pushing `currentPeriodEnd` forward. The backend already
  handled same-plan purchases correctly (`createOrder`'s downgrade check
  requires the target plan to differ from the current one, so renewing was
  never misclassified as a scheduled downgrade); the disabled button was the
  only thing in the way. Now shows an enabled "Renew" button (outlined, to
  read as a lower-key action than the "Subscribe" upsell CTA) that charges
  immediately via the normal checkout path, same as an upgrade — no time
  gating (e.g. "only within N days of expiry"), it's just always available.
  Deliberately still no automatic enforcement when a period lapses unrenewed
  (per the same product decision as the pending-downgrade note above) —
  status stays `ACTIVE` and access is unaffected either way.
- ⏳ Full proration, dunning/retry sequencing beyond marking `PAST_DUE`,
  invoice history UI — no self-serve portal to cover these, so they'd all need
  custom UI if ever built
- ⏳ Marketing Pricing page CTAs are unchanged — they still link to `/register`,
  not directly into checkout; billing is managed from `/portal/settings` after
  the free trial, not from the Pricing page itself

## Phase 8 — Admin Portal — MVP ✅ done (integrated deployment, separate identity)

Decided 2026-08-09 after a first attempt (an `/admin` route gated by a `User.isAdmin`
flag on the customer's own account) was deliberately built and then fully removed —
reusing the customer table for platform staff was rejected as the wrong shape. A
second, fully-separate-apps design (`apps/admin` + `apps/admin-api` as their own
deployable processes) was scoped but deferred; the version actually built takes the
middle path requested the same day: **still deployed inside `apps/web`/`apps/api`,
but with admin identity fully decoupled from customer identity from day one**, so
splitting into separate apps later is a lift-and-shift of the `admin/` folders, not
a data-model migration.

- ✅ `AdminUser`/`AdminSession` Prisma models — own table, own session cookie
  (`admin_session_token`, distinct from the customer `session_token`), own login
  form. No boolean flag anywhere on `User`. Seeded via `prisma/seed.ts`
  (`admin@nextlayer.cloud`, password from `ADMIN_SEED_PASSWORD` env or a dev
  default) since there's no signup flow for admins.
- ✅ Backend: `apps/api/src/admin/` — self-contained module (`AdminAuthController`/
  `AdminAuthService`/`AdminSessionGuard` for auth, `AdminController`/`AdminService`
  for org management), imported into `AppModule` but otherwise untouched by the
  customer-facing code. `GET/POST /admin/auth/*` for login/logout/me,
  `GET /admin/organizations`, `POST .../suspend`, `POST .../reactivate`,
  `PATCH .../subscription` (manual plan/status override, bypasses Stripe),
  `GET /admin/audit-log`.
- ✅ `Organization.suspendedAt` — enforced in both `AuthService.login` and the
  customer-facing `SessionGuard` (not just at login), so suspending an org
  immediately invalidates any of that org's existing sessions too.
- ✅ Frontend: `apps/web/src/app/admin/` — `/admin/login` (separate page, reuses
  `AuthShell`, posts to `/admin/auth/login`), `/admin` (organizations table:
  owner, plan, status, members, storage, suspend/reactivate, plan override modal),
  `/admin/audit-log`. Route-grouped so only the authenticated pages render
  `AdminShell` — the login page stays outside the auth-gate to avoid a redirect
  loop.
- ✅ `POST /admin/customers` — admin creates a full customer account (User +
  Organization + OWNER Membership + 14-day Business trial Subscription) in one
  step, same shape as a real self-serve signup, for sales-assisted onboarding.
  Shares the slug-generation logic with `AuthService.register` via
  `organizations/slug.util.ts` rather than duplicating it.
- ✅ Manual comp/discount fields on `Subscription` — `discountPercent` (0-100)
  and `freeUntil` (a "comped until" date), admin-settable from the same plan
  override modal (its help text now says "applies at their next
  renewal/purchase — never retroactive to what they've already paid", since
  that's exactly the confusion this caused the first time it shipped).
  **Fixed 2026-08-09: `discountPercent` was purely cosmetic — `BillingService
  .createOrder` never actually applied it to the Razorpay order amount, so a
  customer would see a discounted price in the UI but still get charged full
  price at checkout.** Now `createOrder` reduces `amount` by the org's
  existing `discountPercent` before creating the order, so it's a real,
  prospective discount honored at the customer's *next* checkout — regardless
  of which plan they choose, since the discount is org-level, not tied to one
  specific plan. On `/portal/settings`, the summary card reads "N% off will
  apply at your next renewal" (previously "N% discount applied", which read
  as already-in-effect on the currently-active, already-paid-for period), and
  the discounted price now shows on every purchasable plan row — not just the
  disabled "Current plan" one — since any of them would honor it.
- ✅ `/admin/plans` — full CRUD on the `Plan` table itself (name, monthly/yearly
  price, storage/seat limits, feature list), separate from per-org subscription
  overrides. `GET/POST /admin/plans`, `PATCH/DELETE /admin/plans/:id`. Deleting
  a plan still referenced by any `Subscription` is rejected with a clear
  "in use by N organizations" error rather than a raw FK-constraint failure.
  New/renamed plans show up immediately in the existing subscription-override
  dropdown — no separate wiring needed since it already reads `/billing/plans`.
- ✅ Billing cycle (Monthly/Annual) and renewal/expiry date (`currentPeriodEnd`)
  are now editable from the same override modal — previously only settable
  automatically (trial signup, Stripe webhook), with no admin path to correct
  or extend them. The organizations table also shows "Renews ..." under each
  org's status so the date is visible without opening the modal.
- ✅ Admin plan pricing displays in ₹ (INR) instead of $ — this platform sells
  in India. Applies to the admin plan list/form and the customer's
  `/portal/settings` billing tab; the public marketing pricing/home pages and
  Stripe checkout currency were deliberately left as-is (not requested).
- ✅ Verified end-to-end in a real browser: unauthenticated `/admin` redirects to
  `/admin/login`; login → organizations list; new customer creation → account
  can immediately log in on the customer side; duplicate email rejected inline;
  suspend Acme Labs → its owner's `/auth/login` immediately starts returning
  401; reactivate → login works again; plan override (Business/ACTIVE →
  Starter/PAST_DUE) reflected instantly in the table; discount/comp override
  shows up both in the admin table and on the customer's billing tab; audit
  log renders; logout → redirected, direct `/admin` access re-redirects.
- Note: `prisma.subscription.upsert()` with an explicitly-`undefined` scalar
  FK (`planId: undefined`) in the unused `create` branch throws
  `PrismaClientValidationError` ("Argument `organization` is missing") at
  runtime even though that branch never executes — Prisma can't resolve the
  checked/unchecked create-input union in that case. Fixed by splitting
  `updateSubscription` into explicit `update`/`create` calls instead of a
  single `upsert`.
- ✅ `/admin/organizations/[id]` — a dedicated per-organization detail page
  (`GET /admin/organizations/:id`), since cramming everything into the list
  row + modals stopped scaling once billing cycle, renewal date, discount/comp,
  transaction history, and audit log all needed a place to live. Shows: org
  overview (created date, member count, storage used), full subscription
  detail with the same "Change plan" override modal reused from the list page
  (refactored to a narrow `SubscriptionOverrideTarget` shape so it isn't
  coupled to the list row's exact type), the complete members list with roles
  (the list page's `owner` field only ever showed one person), transaction
  history (`GET /admin/organizations/:id/transactions`), and an audit log
  scoped to just that org (`GET /admin/audit-log` gained an optional
  `?organizationId=` filter — same underlying query as the platform-wide
  `/admin/audit-log` page, just filtered). Org names in the list table now
  link here; suspend/reactivate and plan override work from either place.
- ✅ Trial period is admin-manageable — it already was, technically (a
  TRIALING subscription's `status` and `currentPeriodEnd` are just the same
  fields the override modal edits), but the UI unconditionally labeled that
  date "Renews ..." even for trials, which read as wrong/confusing. Now shows
  "Trial ends ..." when `status === "TRIALING"`, in the customer's
  `/portal/settings`, the admin organizations list, and the org detail page.
- ✅ Per-org storage limit override + real enforcement — previously the
  storage limit was purely cosmetic (a progress bar), inherited from the plan
  with no way to grant one customer more or less, and never actually enforced
  server-side. Added `Subscription.storageLimitGbOverride` (null = inherit the
  plan's `storageLimitGb`), editable from the same override modal, and
  `OrganizationsService.assertWithinQuota()` — called from
  `FilesService.requestUploadUrl` (the client already sends `sizeBytes` when
  requesting the presigned URL, so the check happens *before* anything is
  uploaded to Wasabi, not after) — which rejects the upload with a clear
  message once an org would exceed its effective limit. The customer-facing
  storage bar in the portal sidebar picks up the override automatically since
  it reads through the same `OrganizationsService.getUsage()`.
- **Bug found and fixed while testing the above**: `AuthService.register` and
  `AdminService.createCustomer` both picked the new-signup trial plan via
  `prisma.plan.findFirst({ where: { name: "Business" } })` — a **name-based
  lookup**, silently broken the moment that plan got renamed (which the admin
  Plans page now lets you do freely). Concretely: **every signup since the
  seeded "Business" plan was renamed — both real self-serve registrations and
  admin-created customers — got no plan and no subscription at all**, with no
  error surfaced anywhere. Fixed by adding `Plan.isDefault` (admin-settable
  checkbox on the plan form, enforced server-side so at most one plan has it
  set at a time) and switching both signup paths to look it up by that flag
  instead of by name, with a creation-order fallback so signups never silently
  no-op even if no plan is marked default. Repaired the live data by marking
  the current "Plus" plan (ex-"Business") as default, and confirmed via a
  fresh `createCustomer` call that new orgs now get a real `TRIALING`
  subscription again.
- ⏳ Impersonation-for-support, platform-level metrics/dashboards — not built,
  out of scope for this pass.
- ⏳ Splitting into fully separate `apps/admin`/`apps/admin-api` processes —
  still the long-term target if/when it's warranted (e.g. separate deploy
  cadence or access control from the customer app); not needed yet since
  identity is already decoupled at the data layer.

## Phase 9 — Production Hardening & Launch

Cross-cutting, done incrementally alongside Phases 4–8, but gated before public launch.

- Security review (auth flows, file access controls, dependency audit)
- CI/CD pipeline, staging environment
- Observability: error tracking, logging, uptime monitoring (the Status page currently
  shows static data — this is what would eventually feed it for real)
- Load/performance testing on file upload/download paths
- Accessibility audit across marketing site + portal
