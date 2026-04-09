# 3dprintingbandung Landing Page — Design Spec

**Date:** 2026-04-10
**Status:** Draft — pending user review
**Scope:** MVP (Fase 1) of the public landing page for brand 3dprintingbandung

---

## 1. Purpose & Goals

Build a public landing page for **3dprintingbandung** that:

1. **Brand awareness** — introduce the brand and its three product pillars to first-time visitors.
2. **Redirect sales traffic to marketplaces** — Shopee, Tokopedia, TikTok Shop. The landing page does not sell directly.
3. **Showcase the in-development Silhouette Art Generator** as a "Coming Soon" feature and capture a waitlist to inform electronic-component pre-order planning.
4. **Enable delegation of content updates** to non-technical operators through a polished CMS admin UI, so the founder can focus on R&D.

Primary KPI: marketplace click-throughs + waitlist signups.

## 2. Audience & Context

- **Primary audience:** Indonesian consumers interested in 3D-printed keychains, fidget toys, cosplay props, and small custom prints.
- **Secondary audience:** International visitors (for the Silhouette Generator); English translation is required from day one because the generator will target markets outside Indonesia.
- **Domain:** `3dprintingbandung.my.id`
- **Physical presence:** Bandung, Indonesia — relevant for `LocalBusiness` structured data.

## 3. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Astro 5** | Static-first, minimal JS, built-in i18n, fast builds, strong SEO |
| Styling | **Tailwind CSS v4** | Utility-first, small output, fast iteration |
| Language | **TypeScript** | Type safety across Astro components and Sanity client |
| CMS | **Sanity** (Content Lake + self-hosted Studio) | Polished admin UI, generous free tier, image CDN, localized fields, friendly to non-technical operators |
| Hosting | **Cloudflare Pages** | Free static hosting with CDN, auto-deploy from git, unified dashboard for both `apps/web` and `apps/studio` |
| Analytics | **Cloudflare Web Analytics** | Free, privacy-first, no cookie banner, zero cookie-consent friction for EU/US visitors |
| Fonts | **Inter** (body) + **Space Grotesk** (heading) via **Fontsource** (self-hosted) | Modern, playful, fast, privacy-friendly. Final pick may be revisited once logo is in place. |
| Carousel | **Embla Carousel** | Lightweight, accessible, works well with Astro islands |

### Explicitly NOT chosen (and why)

- **Next.js** — heavier than needed for a primarily static landing page.
- **Strapi / Directus / self-hosted headless CMS** — adds operational burden that contradicts the user's goal of delegating operations.
- **Decap / Sveltia (git-based CMS)** — less polished admin UI, weaker image handling, not ideal for non-technical operators.
- **Google Analytics 4** — requires cookie consent banner, heavier, overkill for this scope.
- **Monorepo tools (Turborepo / Nx)** — unnecessary complexity for two apps; simple `apps/` folder is enough.

## 4. Architecture

```
┌─────────────────────────────┐    ┌─────────────────────────────┐
│  Cloudflare Pages           │    │  Sanity Cloud (managed)     │
│  (self-hosted)              │    │  (free tier)                │
│                             │    │                             │
│  ┌───────────────────────┐  │    │  ┌───────────────────────┐  │
│  │ apps/web              │──┼────┼─►│ Content Lake (DB)     │  │
│  │ 3dprintingbandung.my.id│ │    │  │ Image CDN             │  │
│  └───────────────────────┘  │    │  │ Auth                  │  │
│                             │    │  │ API                   │  │
│  ┌───────────────────────┐  │    │  └───────────────────────┘  │
│  │ apps/studio           │──┼────┼─────────▲                   │
│  │ cms.3dprintingbandung │  │    │         │                   │
│  └───────────────────────┘  │    └─────────┼───────────────────┘
└─────────────────────────────┘              │
                                             │
                                      Admin (team ops)
                                      login & edit content
```

**Responsibility split:**

- **Cloudflare Pages hosts** two independent static builds: the landing page (`apps/web`) and the Sanity Studio admin UI (`apps/studio`). Both are purely static — no server-side runtime in our infrastructure.
- **Sanity Cloud hosts** the Content Lake (document database), authentication, REST/GraphQL API, and Image CDN. This is managed, we do not operate it.
- **Admin workflow:** team members log into `cms.3dprintingbandung.my.id`, edit documents, click Publish. A Sanity webhook triggers a Cloudflare Pages deploy hook that rebuilds `apps/web` in ~1 minute. Visitors always see the latest content without us touching code.

### Repository layout

```
3dpb-app/
├── apps/
│   ├── web/                    # Astro landing page
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── index.astro        # redirects → /id/
│   │   │   │   ├── id/index.astro     # Indonesian landing
│   │   │   │   └── en/index.astro     # English landing
│   │   │   ├── components/
│   │   │   │   ├── Navbar.astro
│   │   │   │   ├── Hero.astro
│   │   │   │   ├── Pillars.astro
│   │   │   │   ├── GeneratorComingSoon.astro
│   │   │   │   ├── ProductGrid.astro
│   │   │   │   ├── ProductCard.astro
│   │   │   │   ├── Gallery.astro
│   │   │   │   ├── MarketplaceCTA.astro
│   │   │   │   ├── Footer.astro
│   │   │   │   ├── LanguageSwitcher.astro
│   │   │   │   └── WaitlistForm.astro  # React island (interactive)
│   │   │   ├── i18n/
│   │   │   │   ├── id.json
│   │   │   │   └── en.json
│   │   │   ├── layouts/
│   │   │   │   └── BaseLayout.astro
│   │   │   └── lib/
│   │   │       ├── sanity.ts           # Sanity client + queries
│   │   │       └── i18n.ts             # translation helpers
│   │   ├── public/
│   │   │   └── assets/                 # logo, favicon, static images
│   │   ├── astro.config.mjs
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── studio/                # Sanity Studio (React admin UI)
│       ├── schemas/
│       │   ├── index.ts
│       │   ├── siteSettings.ts
│       │   ├── product.ts
│       │   ├── galleryItem.ts
│       │   ├── silhouetteGenerator.ts
│       │   └── waitlistEntry.ts
│       ├── sanity.config.ts
│       └── package.json
│
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-04-10-landing-page-design.md   # this file
└── README.md
```

Two apps, two independent `package.json`s, two Cloudflare Pages projects, two subdomains. No shared workspace tooling (no Turborepo/pnpm workspaces) — kept intentionally simple.

## 5. Sanity Schemas

All localized fields use the `internationalized-array` pattern so admins see one form with per-language inputs (ID + EN).

### 5.1 `siteSettings` (singleton)

Global configuration shown across the entire site.

```ts
{
  brandName: string                   // non-localized
  tagline: localizedString            // ID + EN
  logo: image
  contact: {
    whatsapp: string                  // phone number, e.g. "+62 812..."
    instagram: string                 // handle without @
    email: string
    address: localizedText
    operatingHours: localizedString
  }
  marketplaceLinks: {
    shopee: url
    tokopedia: url
    tiktokShop: url
  }
  seo: {
    defaultTitle: localizedString
    defaultDescription: localizedText
    ogImage: image
  }
}
```

### 5.2 `product`

Featured products shown in the product grid.

```ts
{
  title: localizedString              // e.g. "Keychain Naga" / "Dragon Keychain"
  slug: slug
  category: 'keychain' | 'fidget' | 'toy' | 'cosplay' | 'other'
  photos: image[]                     // min 1, max 5, alt text required
  shortDescription: localizedText
  marketplaceLinks: {
    shopee?: url
    tokopedia?: url
    tiktokShop?: url
  }
  featured: boolean                   // show on landing page or not
  order: number                       // display order
}
```

### 5.3 `galleryItem`

Portfolio items for the gallery section.

```ts
{
  title: localizedString
  image: image                        // alt text required
  category: 'custom' | 'cosplay' | 'print-service' | 'showcase'
  caption?: localizedText
  order: number
}
```

### 5.4 `silhouetteGenerator` (singleton)

Content for the Coming Soon section.

```ts
{
  headline: localizedString
  description: localizedText
  devScreenshots: image[]             // dev screenshots supplied by user
  launchStatus: 'coming-soon' | 'beta' | 'live'
  estimatedLaunch?: string            // free text, e.g. "Q3 2026"
}
```

### 5.5 `waitlistEntry`

Waitlist submissions, scoped specifically to the Silhouette Generator (not a general newsletter).

```ts
{
  email: string                       // validated, required
  name?: string                       // optional
  submittedAt: datetime               // auto, server-set
  source: string                      // default "silhouette-generator"
  notes?: text                        // internal, admin-editable
}
```

Admins can filter, sort, and export entries as CSV from the Studio.

### Content intentionally NOT in the CMS (hardcoded in Astro)

These are static, rarely change, and changes usually require design changes too:

- Hero copy (tagline structure, button labels)
- 3-pillar section copy ("Apa yang kami tawarkan" blocks)
- FAQ (not in MVP anyway)
- Cara pesan custom flow (not in MVP anyway)

Translation strings for these live in `src/i18n/id.json` and `src/i18n/en.json`.

## 6. Page Structure & Sections

Single-page landing (`/id/`, `/en/`) with sticky navbar and smooth-scroll section navigation. No multi-page routing.

### Section order (top to bottom)

1. **Navbar (sticky)**
   - Logo (left)
   - Nav links: Produk · Generator · Galeri · Kontak (middle, smooth-scroll anchors)
   - Language switcher (flag dropdown 🇮🇩 🇬🇧) + WhatsApp button (right)

2. **Hero**
   - Brand name / logo prominent
   - Localized tagline + sub-tagline
   - Two CTAs:
     - `[Belanja Marketplace]` → scroll to marketplace section
     - `[Lihat Generator (Soon)]` → scroll to generator section
   - Background: best product photo from CMS (or hardcoded for MVP if none curated)

3. **Apa Yang Kami Tawarkan** (3 pillars)
   - Three cards, each: icon + title + one sentence
     - Produk Siap Kirim
     - Silhouette Art Generator
     - Jasa Custom & 3D Print
   - Hardcoded copy (not in CMS)

4. **⭐ Silhouette Generator — Coming Soon**
   - Headline + description from `silhouetteGenerator` singleton
   - Carousel of dev screenshots
   - "Coming Soon" badge
   - Inline waitlist form (email + optional name) → submits to Sanity via a small server endpoint or Sanity's write API with a restricted token
   - Success state: "Terima kasih! Kami akan kabari kamu saat launch."

5. **Produk Unggulan**
   - Category filter pills: All · Keychain · Fidget · Toy · Cosplay · Other
   - Responsive grid (1 col mobile → 2 col tablet → 3 col desktop)
   - `ProductCard` shows:
     - Mini photo carousel (Embla) with 1–5 photos
     - Title, category, short description
     - Marketplace buttons (only the ones filled in for that product)
     - Clicking a photo opens a lightbox; clicking a marketplace button opens that marketplace in a new tab
   - Fetches from Sanity at build time, filters `featured: true`, orders by `order`

6. **Galeri & Portfolio**
   - Category filter: All · Custom · Cosplay · Print Service · Showcase
   - Masonry grid
   - Lightbox on click

7. **Belanja di Marketplace** (final CTA)
   - Three large buttons with marketplace logos & brand colors: Shopee · Tokopedia · TikTok Shop
   - Pulls URLs from `siteSettings.marketplaceLinks`

8. **Footer**
   - Logo + tagline
   - Contact: WhatsApp, Instagram, email, address, operating hours (from `siteSettings`)
   - Quick links to each section
   - Copyright + small credit line

### Explicitly out of scope for MVP

- ❌ Testimonials section
- ❌ "Cara pesan custom" step-by-step flow
- ❌ About / brand story
- ❌ FAQ
- ❌ Blog / news
- ❌ Payment integration
- ❌ User authentication on landing page
- ❌ Per-product detail pages (cards go straight to marketplace)
- ❌ Dark mode toggle (may still honor `prefers-color-scheme` passively, but no UI toggle)

## 7. Internationalization

### Routing

```
/               → 301 redirect to /id/
/id/            → Indonesian landing (default)
/en/            → English landing
```

- **No auto-detection** from `Accept-Language`. The site always defaults to ID; users choose English manually via the flag switcher.
- After manual selection, the chosen language is persisted in `localStorage` and/or a first-party cookie so return visitors land on their preference without re-selecting.

### Content localization strategy

| Content type | Where | Example |
|---|---|---|
| UI labels / static copy | `src/i18n/id.json`, `src/i18n/en.json` | "Belanja Sekarang", "Lihat Galeri" |
| Dynamic CMS content | Localized fields in Sanity | Product titles, taglines, descriptions |
| Language-specific assets | Localized image fields (only if needed) | Not needed for MVP |

### Fallback behavior

If a Sanity document has only the ID version filled in, the EN page falls back to the ID content for that field. The Studio shows a warning when a localized field is incomplete so admins know to fill both.

### SEO per language

- `<html lang="id">` / `<html lang="en">` set correctly per page
- Per-language `<title>` and `<meta description>` from Sanity
- `<link rel="alternate" hreflang="id" href="...">` and `hreflang="en"` between sibling pages
- `sitemap.xml` auto-generated with both language versions

## 8. Delivery Plan

### Phase 1 (this spec) — MVP

Everything in Sections 3–7 above. Target: deployable, publishable-content, non-technical-admin-friendly landing page with the Silhouette Generator waitlist capture.

### Phase 2 (later, separate spec)

- Testimonials section (new `testimonial` schema)
- Cara pesan custom step-by-step section
- About / brand story section
- FAQ section
- Possibly blog / news section for SEO

Each Phase 2 section is additive and should not require re-architecting anything from Phase 1.

## 9. Non-Functional Requirements

### Performance targets (Lighthouse, mobile)

| Metric | Target |
|---|---|
| Performance | ≥ 95 |
| Accessibility | ≥ 95 |
| SEO | 100 |
| Best Practices | ≥ 95 |
| First Contentful Paint | < 1.2s on fast 3G |
| Total JS shipped (first load) | < 50 KB gzipped |

Images are served via Sanity's image CDN with automatic WebP/AVIF conversion and responsive `srcset`.

### Accessibility (WCAG 2.1 AA baseline)

- Semantic HTML landmarks (`<nav>`, `<main>`, `<section>`, `<footer>`)
- Alt text is a required field on all image uploads in Sanity schemas
- Color contrast ratio ≥ 4.5:1 for body text (verified once brand palette is set)
- Full keyboard navigation with visible focus states
- Language switcher uses `<button>` with clear ARIA labels
- Waitlist form: labeled inputs, inline error messages, success announcement for screen readers

### SEO essentials

- Per-language `<title>` and `<meta description>` from `siteSettings`
- Open Graph + Twitter Card tags (for WhatsApp/Telegram/social previews)
- JSON-LD structured data:
  - `Organization` schema
  - `LocalBusiness` schema (physical presence in Bandung)
- Auto-generated `sitemap.xml` with `hreflang` alternates
- Standard `robots.txt`

## 10. Deployment & Operational Flow

### Local development

```bash
# Two independent dev servers
cd apps/web    && npm run dev    # http://localhost:4321
cd apps/studio && npm run dev    # http://localhost:3333
```

### Production deploy

Two Cloudflare Pages projects, both reading from the same git repository, each with a different root directory:

- **Project A** — root `apps/web` → `3dprintingbandung.my.id`
- **Project B** — root `apps/studio` → `cms.3dprintingbandung.my.id`

Both rebuild automatically on push to `main`. Direct to production — no staging subdomain for MVP, since the site is not yet publicly announced and the risk surface is small.

### Content publish flow

```
Admin publishes in Studio
  → Sanity webhook fires
  → Cloudflare Pages deploy hook (apps/web project only)
  → Astro rebuilds static site with new content (~60s)
  → New version live
```

The studio deploy is independent: it only redeploys when `apps/studio/**` code changes, not when content changes.

### Environment variables

- `SANITY_PROJECT_ID` — public
- `SANITY_DATASET` — public (`production`)
- `SANITY_READ_TOKEN` — only if we need draft previews (optional for MVP)
- `SANITY_WRITE_TOKEN` — for waitlist form submissions; **scoped write-only to `waitlistEntry` documents**, stored in Cloudflare Pages environment variables, never exposed to the client
- `CLOUDFLARE_DEPLOY_HOOK_URL` — registered in Sanity webhook settings

The waitlist form submits to a small Astro endpoint (`/api/waitlist`) that proxies to Sanity with the write token. The client never sees the token. This is an Astro API route using Cloudflare Pages Functions.

## 11. Verification Checklist (Definition of Done)

Before claiming MVP complete, verify:

- [ ] `apps/web` and `apps/studio` both run locally without errors
- [ ] Sanity Studio shows all 5 schemas with localized inputs working correctly
- [ ] Creating a product in Studio, publishing, and rebuilding shows it on the landing page
- [ ] Language switcher toggles between ID and EN correctly, scroll position preserved
- [ ] Waitlist form submits successfully, entry appears in Sanity Studio
- [ ] Waitlist write token is write-only and scoped; cannot be used to read other data
- [ ] Lighthouse scores meet targets on both mobile and desktop (tested on production URL)
- [ ] Responsive layout checked at 375px, 768px, 1280px breakpoints
- [ ] `apps/web` deployed to `3dprintingbandung.my.id` via Cloudflare Pages
- [ ] `apps/studio` deployed to `cms.3dprintingbandung.my.id` via Cloudflare Pages
- [ ] Sanity publish webhook successfully triggers Astro rebuild
- [ ] Cloudflare Web Analytics beacon present and recording pageviews
- [ ] SEO tags (title, description, OG, hreflang, JSON-LD) verified via view-source and a validator
- [ ] `robots.txt` and `sitemap.xml` accessible and correct

## 12. Open Questions / Assumptions

These are items not explicitly confirmed during brainstorming; flagged here for review:

1. **Brand palette** — logo will be supplied by the user, but specific brand colors are not yet defined. Assumed: derive primary/accent from logo once available; use neutral grays otherwise.
2. **Font pick confirmation** — Inter + Space Grotesk is a placeholder default. May be revisited once logo/branding is finalized.
3. **Initial product count** — unknown how many products will be ready in Sanity at launch. Layout should gracefully handle 0 featured products (empty state) through 20+ (paginate or cap at 12 on the landing).
4. **Image asset source** — logo will be placed in `apps/web/public/assets/`. Dev screenshots for the Silhouette Generator will be uploaded by the user directly into the Sanity `silhouetteGenerator` document.
5. **Webhook secret** — the Sanity→Cloudflare deploy hook URL is effectively a shared secret. Assume it's kept in Sanity webhook config only; rotate if accidentally exposed.

None of the above block implementation. They're clarifications to resolve during execution.
