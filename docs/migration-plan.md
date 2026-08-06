# Migration Plan — Design Export → Next.js

Source of truth: `design-export/*.dc.html` (14 pages) + `design-export/support.js` (the design
tool's own preview runtime — not ported). No image assets exist in the export; every visual is a
CSS-drawn placeholder box labeled in IBM Plex Mono (e.g. "product UI placeholder"). Those stay as
placeholder components until real product screenshots/photos are supplied.

## 1. Layout shells (3 variants, no single universal layout)

| Shell | Used by | Header | Footer | Notes |
|---|---|---|---|---|
| **Marketing** | Home, Features, Solutions, Enterprise, Pricing, About, Blog, Contact, Partners, FAQ, Status | Sticky, full nav, collapses to "Menu" button under 1180px | `full` (Home only) or `simple` (rest) | Home also gets the SOC 2 `AnnouncementBar` above the header |
| **Auth** | Login, Register | Wordmark only, no nav | none | Centered card on radial-gradient background |
| **Legal** | Privacy, Terms | Wordmark + "Back to home" | `legal` (centered, single line) | Sticky sidebar table-of-contents + `#anchor` sections |

Route groups mirror this: `app/(marketing)/`, `app/(auth)/`, `app/(legal)/`. Route groups don't
require their own `layout.tsx` here — the variance in nav set and footer variant per page is high
enough that forcing one shared layout per group would need prop-drilling or pathname-branching
inside the layout anyway. Instead each `page.tsx` composes `<Header />` / `<Footer variant="…" />`
directly. This stays honest about where the real variance lives instead of hiding it behind an
abstraction that would immediately need escape hatches.

## 2. Header: convention over props

Nav links differ by section, not globally:

| Nav group | Pages | Links |
|---|---|---|
| `product` | Home, Features, Solutions, Enterprise, Pricing | Features, Solutions, Security\*, Enterprise, Pricing, Developers\* |
| `resources` | Blog, About, FAQ (variant) | Features, Resources\*, Blog, About, Pricing |
| `support` | Contact, FAQ | Features, Pricing, FAQ, Contact |
| `company` | About | Features, Blog, About, Careers\*, Contact |
| `partners` | Partners | Features, Solutions, Developers\*, Partners, Pricing |
| `status` | Status | Features, Documentation\*, Status, Contact |

(\* = page not in export; link renders but points to `#`, per your call on 2026-08-06.)

`Header` is a client component that calls `usePathname()` and looks up the active group from
`constants/navigation.ts` (longest-prefix match) — no `navGroup` prop needed on any page, so
adding a page later means one line in the config, not a touch on every call site. The mobile
breakpoint uses the `nav:` variant (1180px, added to the Tailwind theme in Step 1) instead of the
export's `window.innerWidth` resize-listener approach — same visual behavior, but CSS-driven so
there's no hydration flash or SSR/client mismatch.

## 3. Reusable UI primitives (`components/ui`, `components/common`)

Already scaffolded via shadcn: `button`, `input`, `label`, `textarea`, `checkbox`, `accordion`,
`badge`, `separator`, `table`.

To build in Step 3/4, each backing a pattern repeated across ≥2 pages:

- **PlaceholderVisual** — the mono-labeled gray box standing in for every screenshot/photo.
- **Pill / SegmentedToggle** — same visual pattern, 4 different data sources: pricing
  monthly/annual, Solutions audience switch, Blog category filter, Contact intent switch.
- **FaqAccordion** — used on Home, Pricing, and FAQ (FAQ adds a search filter on top).
- **PricingCard**, **ComparisonTable**, **LogoStrip**, **StatGrid**, **TestimonialCard**,
  **FeatureRow** (alternating image/copy — Home's `featureRows` and Features' `sections`).

## 4. Page-by-page route map

| Route | Source file | Shell | Unique interactive state |
|---|---|---|---|
| `/` | Home.dc.html | Marketing (full footer) | announcement dismiss, mobile menu, FAQ accordion |
| `/features` | Features.dc.html | Marketing | mobile menu, sticky in-page section nav |
| `/solutions` | Solutions.dc.html | Marketing | mobile menu, audience segment switch |
| `/enterprise` | Enterprise.dc.html | Marketing | mobile menu, contact form (uncontrolled visual only) |
| `/pricing` | Pricing.dc.html | Marketing | mobile menu, monthly/annual toggle, FAQ accordion |
| `/about` | About.dc.html | Marketing | mobile menu |
| `/blog` | Blog.dc.html | Marketing | mobile menu, category filter |
| `/contact` | Contact.dc.html | Marketing | mobile menu, intent switch, submit → success state |
| `/partners` | Partners.dc.html | Marketing | mobile menu |
| `/faq` | FAQ.dc.html | Marketing | mobile menu, search filter, accordion |
| `/status` | Status.dc.html | Marketing | none (static) |
| `/privacy` | Privacy.dc.html | Legal | none (static, TOC anchors) |
| `/terms` | Terms.dc.html | Legal | none (static, TOC anchors) |
| `/login` | Login.dc.html | Auth | error-state demo button |
| `/register` | Register.dc.html | Auth | password-strength meter |

## 5. Content strategy

Every array literal currently inlined in each `.dc.html`'s `renderVals()` (features, pricing
tiers, testimonials, FAQs, footer columns, nav configs, blog posts, leadership, etc.) moves to
typed data in `constants/` (e.g. `constants/pricing.ts`, `constants/faqs.ts`,
`constants/navigation.ts`, `constants/footer.ts`), with shapes defined in `types/`. Keeps
components presentational and makes future CMS-backed swaps (post-marketing-site phase) a
data-source change, not a component rewrite.

## 6. Build order for Step 4

1. Shared layout components (`Header`, `Footer`, `AnnouncementBar`, `AuthShell`, `LegalShell`) +
   the primitives in §3 — this is Step 3.
2. Home (exercises the most primitives at once — announcement bar, full footer, FAQ accordion,
   feature rows, pricing cards, testimonials).
3. Pricing, Features, Solutions (reuse Home's primitives, add toggle/segment patterns).
4. Enterprise, About, Partners, Blog, Contact, FAQ, Status (increasingly incremental).
5. Login, Register (Auth shell).
6. Privacy, Terms (Legal shell).

Each page gets reviewed against its source `.dc.html` for pixel accuracy before moving to the
next, per your workflow.
