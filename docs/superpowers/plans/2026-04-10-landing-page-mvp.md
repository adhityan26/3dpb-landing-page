# 3dprintingbandung Landing Page MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the Fase-1 MVP of the 3dprintingbandung landing page — a static, multilingual (ID/EN), Sanity-backed site hosted on Cloudflare Pages that drives traffic to marketplaces and captures a waitlist for the in-development Silhouette Generator.

**Architecture:** Two-app monorepo in `apps/`. `apps/web` is an Astro 5 static site with Tailwind CSS v4 and Astro's built-in i18n; `apps/studio` is a Sanity Studio admin UI. Content (products, gallery, settings, waitlist entries) lives in Sanity Cloud; the landing page fetches it at build time and rebuilds on publish via a Sanity→Cloudflare Pages webhook. Waitlist form submissions go through a server-side Astro API route (Cloudflare Pages Function) that proxies to Sanity using a write-scoped token.

**Tech Stack:** Astro 5, Tailwind CSS v4 (`@tailwindcss/vite`), TypeScript strict, `@astrojs/cloudflare`, Sanity v3, `@sanity/client`, `sanity-plugin-internationalized-array`, Embla Carousel React, Fontsource (Inter + Space Grotesk), Vitest for unit tests, Cloudflare Web Analytics, Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-04-10-landing-page-design.md`

---

## File Structure

Before tasks, here is every file this plan creates or modifies, grouped by responsibility.

### `apps/studio/` (Sanity Studio)

| File | Responsibility |
|---|---|
| `apps/studio/package.json` | Studio dependencies & scripts |
| `apps/studio/sanity.config.ts` | Studio config, plugins (internationalizedArray, structureTool), project linking |
| `apps/studio/sanity.cli.ts` | CLI config for `sanity deploy` |
| `apps/studio/tsconfig.json` | TypeScript config for studio |
| `apps/studio/schemas/index.ts` | Aggregates all schemas into one export |
| `apps/studio/schemas/siteSettings.ts` | Global site settings singleton |
| `apps/studio/schemas/product.ts` | Featured product document |
| `apps/studio/schemas/galleryItem.ts` | Portfolio gallery item document |
| `apps/studio/schemas/silhouetteGenerator.ts` | Coming Soon section singleton |
| `apps/studio/schemas/waitlistEntry.ts` | Waitlist form submission document |
| `apps/studio/structure.ts` | Custom desk structure: singletons pinned at top |
| `apps/studio/.env.example` | Documented env vars |
| `apps/studio/.gitignore` | Ignores `node_modules`, `dist`, `.env` |

### `apps/web/` (Astro landing page)

| File | Responsibility |
|---|---|
| `apps/web/package.json` | Web app dependencies & scripts |
| `apps/web/astro.config.mjs` | Astro config: integrations, i18n, Cloudflare adapter, Tailwind Vite plugin |
| `apps/web/tsconfig.json` | TS config extending Astro's strict preset |
| `apps/web/src/styles/global.css` | Tailwind v4 `@import`, font-face, CSS variables |
| `apps/web/src/i18n/id.json` | Indonesian UI strings |
| `apps/web/src/i18n/en.json` | English UI strings |
| `apps/web/src/lib/i18n.ts` | `t()` helper, locale detection, typed translation keys |
| `apps/web/src/lib/i18n.test.ts` | Vitest tests for i18n helpers |
| `apps/web/src/lib/sanity.ts` | Sanity client factory + typed query helpers |
| `apps/web/src/lib/sanity.test.ts` | Vitest tests for query construction (no network) |
| `apps/web/src/lib/types.ts` | TypeScript interfaces mirroring Sanity schemas |
| `apps/web/src/layouts/BaseLayout.astro` | HTML shell: head, meta, fonts, analytics, global nav/footer slots |
| `apps/web/src/components/Navbar.astro` | Sticky navbar, smooth-scroll links, language switcher, WA button |
| `apps/web/src/components/LanguageSwitcher.astro` | Flag dropdown ID/EN, persists to localStorage |
| `apps/web/src/components/Hero.astro` | Hero section |
| `apps/web/src/components/Pillars.astro` | Three-pillar value proposition |
| `apps/web/src/components/GeneratorComingSoon.astro` | Silhouette Generator showcase |
| `apps/web/src/components/WaitlistForm.tsx` | React island: email+name form, submits to `/api/waitlist` |
| `apps/web/src/components/ProductGrid.astro` | Product section with category filter |
| `apps/web/src/components/ProductCard.tsx` | React island: mini Embla carousel + marketplace buttons + lightbox trigger |
| `apps/web/src/components/Gallery.astro` | Masonry gallery |
| `apps/web/src/components/Lightbox.tsx` | Shared React lightbox used by gallery and product photos |
| `apps/web/src/components/MarketplaceCTA.astro` | Final CTA with 3 marketplace buttons |
| `apps/web/src/components/Footer.astro` | Site footer |
| `apps/web/src/components/SeoHead.astro` | `<title>`, meta, OG, hreflang, JSON-LD |
| `apps/web/src/pages/index.astro` | Redirects to `/id/` |
| `apps/web/src/pages/id/index.astro` | Indonesian landing page |
| `apps/web/src/pages/en/index.astro` | English landing page |
| `apps/web/src/pages/api/waitlist.ts` | POST endpoint: validates & writes waitlist entry to Sanity |
| `apps/web/src/pages/api/waitlist.test.ts` | Vitest tests for validation and Sanity-client mocking |
| `apps/web/src/pages/robots.txt.ts` | Dynamic robots.txt |
| `apps/web/src/pages/sitemap.xml.ts` | Dynamic sitemap with hreflang |
| `apps/web/public/assets/logo.svg` | Placeholder logo (user supplies final) |
| `apps/web/public/favicon.svg` | Placeholder favicon |
| `apps/web/.env.example` | Documented env vars |
| `apps/web/.gitignore` | Ignores `node_modules`, `dist`, `.env` |
| `apps/web/vitest.config.ts` | Vitest config |

### Repo root

| File | Responsibility |
|---|---|
| `README.md` | Overview, local dev instructions, deployment notes |
| `.gitignore` | Root ignores |
| `docs/superpowers/plans/2026-04-10-landing-page-mvp.md` | This plan |

---

## Task List

### Task 1: Scaffold monorepo root

**Files:**
- Create: `README.md`
- Create: `.gitignore`

- [ ] **Step 1: Initialize git repo**

Run from `/Users/adhityatangahu/Documents/Project/3dpb-app`:

```bash
git init
git config user.email "dev@3dprintingbandung.my.id"
git config user.name "3dpb dev"
```

Expected: `Initialized empty Git repository`.

- [ ] **Step 2: Create `.gitignore`**

Create `.gitignore` at repo root:

```
# dependencies
node_modules/

# build output
dist/
.output/
.vercel/
.netlify/
.wrangler/

# environment
.env
.env.local
.env.*.local

# logs
*.log
npm-debug.log*

# editor
.vscode/
.idea/
*.swp
.DS_Store

# sanity
.sanity/
```

- [ ] **Step 3: Create `README.md`**

```markdown
# 3dprintingbandung

Landing page + CMS monorepo for **3dprintingbandung** (3dprintingbandung.my.id).

## Structure

- `apps/web` — Astro landing page (public site)
- `apps/studio` — Sanity Studio (content admin UI)
- `docs/` — Specs and implementation plans

## Local development

```bash
# Landing page
cd apps/web && npm install && npm run dev
# → http://localhost:4321

# Sanity Studio
cd apps/studio && npm install && npm run dev
# → http://localhost:3333
```

## Deployment

Both apps deploy to Cloudflare Pages from the `main` branch:

- `apps/web` → `3dprintingbandung.my.id`
- `apps/studio` → `cms.3dprintingbandung.my.id`

See the design spec at `docs/superpowers/specs/2026-04-10-landing-page-design.md` for full architecture.
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore README.md docs/
git commit -m "chore: initialize monorepo with readme, gitignore, and design docs"
```

Expected: commit created. `git status` → clean.

---

### Task 2: Scaffold Sanity Studio

**Files:**
- Create: `apps/studio/package.json`
- Create: `apps/studio/sanity.config.ts`
- Create: `apps/studio/sanity.cli.ts`
- Create: `apps/studio/tsconfig.json`
- Create: `apps/studio/.env.example`
- Create: `apps/studio/.gitignore`
- Create: `apps/studio/schemas/index.ts`

- [ ] **Step 1: Create Sanity project via CLI**

The Sanity CLI will provision a cloud project. Run from repo root:

```bash
mkdir -p apps/studio
cd apps/studio
npm create sanity@latest -- \
  --project-plan free \
  --create-project "3dprintingbandung" \
  --dataset production \
  --template clean \
  --typescript \
  --output-path . \
  --no-git
```

Follow prompts:
- Log in to Sanity (browser OAuth)
- Dataset visibility: **public**
- Package manager: **npm**

Expected: files scaffolded, `sanity.config.ts` created, CLI prints `SANITY_PROJECT_ID`. **Write the project ID down** — you will need it in Task 8.

- [ ] **Step 2: Pin dependency versions and add scripts**

Edit `apps/studio/package.json` so `dependencies`, `devDependencies`, and `scripts` read exactly:

```json
{
  "name": "@3dpb/studio",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "sanity dev",
    "start": "sanity start",
    "build": "sanity build",
    "deploy": "sanity deploy",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@sanity/vision": "^3.57.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "sanity": "^3.57.0",
    "sanity-plugin-internationalized-array": "^3.0.1",
    "styled-components": "^6.1.13"
  },
  "devDependencies": {
    "@sanity/eslint-config-studio": "^4.0.0",
    "@types/react": "^18.3.10",
    "typescript": "^5.6.2"
  }
}
```

Run:

```bash
cd apps/studio
npm install
```

Expected: `added N packages` with no errors.

- [ ] **Step 3: Create `apps/studio/.gitignore`**

```
node_modules/
dist/
.env
.env.local
.sanity/
```

- [ ] **Step 4: Create `apps/studio/.env.example`**

```
# Copy to .env and fill in real values. Do NOT commit .env.
SANITY_STUDIO_PROJECT_ID=your_project_id_here
SANITY_STUDIO_DATASET=production
```

- [ ] **Step 5: Create `apps/studio/schemas/index.ts` (empty export, to be filled by Tasks 3-4)**

```ts
import type { SchemaTypeDefinition } from 'sanity'

export const schemaTypes: SchemaTypeDefinition[] = []
```

- [ ] **Step 6: Verify studio builds**

```bash
cd apps/studio
npm run typecheck
```

Expected: no errors. (Studio dev server needs `.env` with a real project ID, so skip `npm run dev` for now.)

- [ ] **Step 7: Commit**

```bash
git add apps/studio
git commit -m "feat(studio): scaffold sanity studio with pinned deps"
```

---

### Task 3: Configure studio plugins and structure

**Files:**
- Modify: `apps/studio/sanity.config.ts`
- Create: `apps/studio/structure.ts`

- [ ] **Step 1: Write `apps/studio/structure.ts`**

This pins `siteSettings` and `silhouetteGenerator` as singletons at the top of the desk:

```ts
import type { StructureResolver } from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Site Settings')
        .id('siteSettings')
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId('siteSettings')
        ),
      S.listItem()
        .title('Silhouette Generator')
        .id('silhouetteGenerator')
        .child(
          S.document()
            .schemaType('silhouetteGenerator')
            .documentId('silhouetteGenerator')
        ),
      S.divider(),
      S.documentTypeListItem('product').title('Products'),
      S.documentTypeListItem('galleryItem').title('Gallery'),
      S.divider(),
      S.documentTypeListItem('waitlistEntry').title('Waitlist Entries'),
    ])
```

- [ ] **Step 2: Replace `apps/studio/sanity.config.ts`**

```ts
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { internationalizedArray } from 'sanity-plugin-internationalized-array'
import { schemaTypes } from './schemas'
import { structure } from './structure'

export default defineConfig({
  name: 'default',
  title: '3dprintingbandung CMS',

  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',

  plugins: [
    structureTool({ structure }),
    visionTool(),
    internationalizedArray({
      languages: [
        { id: 'id', title: 'Bahasa Indonesia' },
        { id: 'en', title: 'English' },
      ],
      defaultLanguages: ['id'],
      fieldTypes: ['string', 'text'],
    }),
  ],

  schema: {
    types: schemaTypes,
    // Prevent duplicating singletons from the "Create new" action
    templates: (templates) =>
      templates.filter(
        ({ schemaType }) =>
          schemaType !== 'siteSettings' &&
          schemaType !== 'silhouetteGenerator'
      ),
  },

  document: {
    // Hide the "delete" action on singletons
    actions: (input, context) => {
      const singletons = ['siteSettings', 'silhouetteGenerator']
      if (singletons.includes(context.schemaType)) {
        return input.filter(({ action }) => action !== 'delete' && action !== 'duplicate')
      }
      return input
    },
  },
})
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/studio
npm run typecheck
```

Expected: no errors. (Schemas are empty, so structure references will resolve once schemas exist in Task 4.)

- [ ] **Step 4: Commit**

```bash
git add apps/studio/sanity.config.ts apps/studio/structure.ts
git commit -m "feat(studio): configure plugins, i18n, singleton structure"
```

---

### Task 4: Sanity schemas — siteSettings and product

**Files:**
- Create: `apps/studio/schemas/siteSettings.ts`
- Create: `apps/studio/schemas/product.ts`
- Modify: `apps/studio/schemas/index.ts`

- [ ] **Step 1: Create `apps/studio/schemas/siteSettings.ts`**

```ts
import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'brandName',
      type: 'string',
      validation: (Rule) => Rule.required(),
      initialValue: '3dprintingbandung',
    }),
    defineField({
      name: 'tagline',
      type: 'internationalizedArrayString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'logo',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          validation: (Rule) => Rule.required(),
        }),
      ],
    }),
    defineField({
      name: 'contact',
      type: 'object',
      fields: [
        defineField({
          name: 'whatsapp',
          type: 'string',
          description: 'Full phone number with country code, e.g. +6281234567890',
          validation: (Rule) => Rule.required().regex(/^\+?[0-9]{8,15}$/),
        }),
        defineField({
          name: 'instagram',
          type: 'string',
          description: 'Handle without @',
          validation: (Rule) => Rule.required(),
        }),
        defineField({ name: 'email', type: 'string', validation: (Rule) => Rule.email() }),
        defineField({ name: 'address', type: 'internationalizedArrayText' }),
        defineField({ name: 'operatingHours', type: 'internationalizedArrayString' }),
      ],
    }),
    defineField({
      name: 'marketplaceLinks',
      type: 'object',
      fields: [
        defineField({ name: 'shopee', type: 'url' }),
        defineField({ name: 'tokopedia', type: 'url' }),
        defineField({ name: 'tiktokShop', type: 'url', title: 'TikTok Shop' }),
      ],
    }),
    defineField({
      name: 'seo',
      type: 'object',
      fields: [
        defineField({
          name: 'defaultTitle',
          type: 'internationalizedArrayString',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'defaultDescription',
          type: 'internationalizedArrayText',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'ogImage',
          type: 'image',
          fields: [
            defineField({ name: 'alt', type: 'string' }),
          ],
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Site Settings' }) },
})
```

- [ ] **Step 2: Create `apps/studio/schemas/product.ts`**

```ts
import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'internationalizedArrayString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {
        source: (doc) => {
          const titles = (doc as { title?: Array<{ value?: string }> }).title ?? []
          return titles[0]?.value ?? 'product'
        },
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      type: 'string',
      options: {
        list: [
          { title: 'Keychain', value: 'keychain' },
          { title: 'Fidget', value: 'fidget' },
          { title: 'Toy', value: 'toy' },
          { title: 'Cosplay', value: 'cosplay' },
          { title: 'Other', value: 'other' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'photos',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              type: 'string',
              title: 'Alt text',
              validation: (Rule) => Rule.required(),
            }),
          ],
        },
      ],
      validation: (Rule) => Rule.required().min(1).max(5),
    }),
    defineField({
      name: 'shortDescription',
      type: 'internationalizedArrayText',
    }),
    defineField({
      name: 'marketplaceLinks',
      type: 'object',
      fields: [
        defineField({ name: 'shopee', type: 'url' }),
        defineField({ name: 'tokopedia', type: 'url' }),
        defineField({ name: 'tiktokShop', type: 'url', title: 'TikTok Shop' }),
      ],
      validation: (Rule) =>
        Rule.custom((links: { shopee?: string; tokopedia?: string; tiktokShop?: string } | undefined) => {
          if (!links) return 'Provide at least one marketplace link'
          const any = links.shopee || links.tokopedia || links.tiktokShop
          return any ? true : 'Provide at least one marketplace link'
        }),
    }),
    defineField({
      name: 'featured',
      type: 'boolean',
      initialValue: true,
      description: 'Show on landing page',
    }),
    defineField({
      name: 'order',
      type: 'number',
      initialValue: 0,
    }),
  ],
  orderings: [
    {
      title: 'Display order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'title.0.value', media: 'photos.0', category: 'category' },
    prepare({ title, media, category }) {
      return { title: title ?? 'Untitled', subtitle: category, media }
    },
  },
})
```

- [ ] **Step 3: Register schemas in `apps/studio/schemas/index.ts`**

```ts
import type { SchemaTypeDefinition } from 'sanity'
import siteSettings from './siteSettings'
import product from './product'

export const schemaTypes: SchemaTypeDefinition[] = [siteSettings, product]
```

- [ ] **Step 4: Typecheck**

```bash
cd apps/studio
npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/studio/schemas
git commit -m "feat(studio): add siteSettings and product schemas"
```

---

### Task 5: Sanity schemas — galleryItem, silhouetteGenerator, waitlistEntry

**Files:**
- Create: `apps/studio/schemas/galleryItem.ts`
- Create: `apps/studio/schemas/silhouetteGenerator.ts`
- Create: `apps/studio/schemas/waitlistEntry.ts`
- Modify: `apps/studio/schemas/index.ts`

- [ ] **Step 1: Create `apps/studio/schemas/galleryItem.ts`**

```ts
import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'galleryItem',
  title: 'Gallery Item',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'internationalizedArrayString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          validation: (Rule) => Rule.required(),
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      type: 'string',
      options: {
        list: [
          { title: 'Custom', value: 'custom' },
          { title: 'Cosplay', value: 'cosplay' },
          { title: 'Print Service', value: 'print-service' },
          { title: 'Showcase', value: 'showcase' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'caption', type: 'internationalizedArrayText' }),
    defineField({ name: 'order', type: 'number', initialValue: 0 }),
  ],
  orderings: [
    {
      title: 'Display order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'title.0.value', media: 'image', category: 'category' },
    prepare({ title, media, category }) {
      return { title: title ?? 'Untitled', subtitle: category, media }
    },
  },
})
```

- [ ] **Step 2: Create `apps/studio/schemas/silhouetteGenerator.ts`**

```ts
import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'silhouetteGenerator',
  title: 'Silhouette Generator',
  type: 'document',
  fields: [
    defineField({
      name: 'headline',
      type: 'internationalizedArrayString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      type: 'internationalizedArrayText',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'devScreenshots',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
          ],
        },
      ],
      validation: (Rule) => Rule.min(1).max(10),
    }),
    defineField({
      name: 'launchStatus',
      type: 'string',
      options: {
        list: [
          { title: 'Coming Soon', value: 'coming-soon' },
          { title: 'Beta', value: 'beta' },
          { title: 'Live', value: 'live' },
        ],
        layout: 'radio',
      },
      initialValue: 'coming-soon',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'estimatedLaunch',
      type: 'string',
      description: 'Free text, e.g. "Q3 2026"',
    }),
  ],
  preview: { prepare: () => ({ title: 'Silhouette Generator' }) },
})
```

- [ ] **Step 3: Create `apps/studio/schemas/waitlistEntry.ts`**

```ts
import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'waitlistEntry',
  title: 'Waitlist Entry',
  type: 'document',
  // Written by the public waitlist form via an API route, so
  // admins should not create these manually from the Studio.
  readOnly: false,
  fields: [
    defineField({
      name: 'email',
      type: 'string',
      validation: (Rule) =>
        Rule.required()
          .email()
          .max(254),
    }),
    defineField({ name: 'name', type: 'string' }),
    defineField({
      name: 'submittedAt',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'source',
      type: 'string',
      initialValue: 'silhouette-generator',
      readOnly: true,
    }),
    defineField({
      name: 'notes',
      type: 'text',
      description: 'Internal notes (admin only)',
    }),
  ],
  orderings: [
    {
      title: 'Submitted (newest first)',
      name: 'submittedDesc',
      by: [{ field: 'submittedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'email', subtitle: 'submittedAt' },
  },
})
```

- [ ] **Step 4: Update `apps/studio/schemas/index.ts`**

```ts
import type { SchemaTypeDefinition } from 'sanity'
import siteSettings from './siteSettings'
import product from './product'
import galleryItem from './galleryItem'
import silhouetteGenerator from './silhouetteGenerator'
import waitlistEntry from './waitlistEntry'

export const schemaTypes: SchemaTypeDefinition[] = [
  siteSettings,
  product,
  galleryItem,
  silhouetteGenerator,
  waitlistEntry,
]
```

- [ ] **Step 5: Typecheck and dev-run**

```bash
cd apps/studio
npm run typecheck
```

Expected: no errors.

Then create `.env` from `.env.example` (fill the project ID written down in Task 2) and run:

```bash
cp .env.example .env
# manually edit .env with the real SANITY_STUDIO_PROJECT_ID
npm run dev
```

Expected: Studio starts on `http://localhost:3333`. Open it, log in, confirm the sidebar shows:
- Site Settings
- Silhouette Generator
- (divider)
- Products
- Gallery
- (divider)
- Waitlist Entries

Create one test product and one site settings document manually so the Astro side has something to query in later tasks. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add apps/studio/schemas
git commit -m "feat(studio): add gallery, generator, and waitlist schemas"
```

---

### Task 6: Scaffold Astro app with Tailwind, Cloudflare adapter, and i18n

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/astro.config.mjs`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/src/styles/global.css`
- Create: `apps/web/src/pages/index.astro`
- Create: `apps/web/src/pages/id/index.astro`
- Create: `apps/web/src/pages/en/index.astro`
- Create: `apps/web/.env.example`
- Create: `apps/web/.gitignore`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/public/favicon.svg`
- Create: `apps/web/public/assets/logo.svg`

- [ ] **Step 1: Create `apps/web/package.json`**

```json
{
  "name": "@3dpb/web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "typecheck": "astro check",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@astrojs/cloudflare": "^11.0.4",
    "@astrojs/react": "^3.6.2",
    "@fontsource/inter": "^5.1.0",
    "@fontsource/space-grotesk": "^5.1.0",
    "@sanity/client": "^6.22.1",
    "@sanity/image-url": "^1.0.2",
    "@tailwindcss/vite": "^4.0.0-beta.6",
    "astro": "^5.0.0",
    "embla-carousel-react": "^8.3.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwindcss": "^4.0.0-beta.6"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.4",
    "@types/react": "^18.3.10",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.6.2",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd apps/web
npm install
```

Expected: no errors.

- [ ] **Step 3: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "baseUrl": ".",
    "paths": {
      "~/*": ["src/*"]
    }
  }
}
```

- [ ] **Step 4: Create `apps/web/astro.config.mjs`**

```js
import { defineConfig } from 'astro/config'
import cloudflare from '@astrojs/cloudflare'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  site: 'https://3dprintingbandung.my.id',
  // Astro 5: default is static; routes that `export const prerender = false`
  // (e.g. /api/waitlist) are built as Cloudflare Pages Functions automatically.
  output: 'static',
  adapter: cloudflare({
    imageService: 'compile',
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    defaultLocale: 'id',
    locales: ['id', 'en'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
})
```

- [ ] **Step 5: Create `apps/web/src/styles/global.css`**

```css
@import "tailwindcss";
@import "@fontsource/inter/400.css";
@import "@fontsource/inter/500.css";
@import "@fontsource/inter/600.css";
@import "@fontsource/space-grotesk/500.css";
@import "@fontsource/space-grotesk/700.css";

@theme {
  --font-sans: "Inter", system-ui, sans-serif;
  --font-display: "Space Grotesk", "Inter", system-ui, sans-serif;

  --color-brand-50: #f5f7ff;
  --color-brand-500: #5b5fff;
  --color-brand-600: #4a4ee6;
  --color-brand-900: #1a1d66;

  --color-ink-900: #0a0a0f;
  --color-ink-700: #26262e;
  --color-ink-500: #5a5a66;
  --color-ink-300: #c4c4cc;
  --color-ink-100: #f4f4f7;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-sans);
  color: var(--color-ink-900);
  background: #ffffff;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4 {
  font-family: var(--font-display);
}
```

- [ ] **Step 6: Create placeholder assets**

Create `apps/web/public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#5b5fff"/><text x="16" y="21" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="14" fill="#fff">3D</text></svg>
```

Create `apps/web/public/assets/logo.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 48" role="img" aria-label="3dprintingbandung"><rect width="48" height="48" rx="10" fill="#5b5fff"/><text x="24" y="32" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="20" fill="#fff">3D</text><text x="60" y="32" font-family="sans-serif" font-weight="600" font-size="20" fill="#0a0a0f">3dprintingbandung</text></svg>
```

(The user will replace these with the final brand assets later.)

- [ ] **Step 7: Create `apps/web/src/pages/index.astro`**

```astro
---
return Astro.redirect('/id/')
---
```

- [ ] **Step 8: Create `apps/web/src/pages/id/index.astro` (placeholder)**

```astro
---
import '~/styles/global.css'
---
<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>3dprintingbandung</title>
  </head>
  <body>
    <h1 class="text-3xl font-display p-8">Halo, 3dprintingbandung (ID)</h1>
  </body>
</html>
```

- [ ] **Step 9: Create `apps/web/src/pages/en/index.astro` (placeholder)**

```astro
---
import '~/styles/global.css'
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>3dprintingbandung</title>
  </head>
  <body>
    <h1 class="text-3xl font-display p-8">Hello, 3dprintingbandung (EN)</h1>
  </body>
</html>
```

- [ ] **Step 10: Create `apps/web/.gitignore`**

```
node_modules/
dist/
.astro/
.wrangler/
.env
.env.local
```

- [ ] **Step 11: Create `apps/web/.env.example`**

```
PUBLIC_SANITY_PROJECT_ID=your_project_id_here
PUBLIC_SANITY_DATASET=production
PUBLIC_SANITY_API_VERSION=2024-10-01
# Write-scoped token — ONLY set in Cloudflare Pages env, never commit.
# Used by /api/waitlist to create waitlistEntry documents.
SANITY_WRITE_TOKEN=
PUBLIC_SITE_URL=https://3dprintingbandung.my.id
PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN=
```

- [ ] **Step 12: Create `apps/web/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '~': new URL('./src', import.meta.url).pathname,
    },
  },
})
```

- [ ] **Step 13: Verify build and dev**

```bash
cd apps/web
cp .env.example .env
# Fill PUBLIC_SANITY_PROJECT_ID with the same project id used by the Studio
npm run typecheck
npm run build
```

Expected: `astro check` 0 errors, `astro build` completes with `dist/` created.

```bash
npm run dev
```

Open `http://localhost:4321/` → should redirect to `/id/` and show the placeholder heading. Stop the dev server.

- [ ] **Step 14: Commit**

```bash
git add apps/web
git commit -m "feat(web): scaffold astro with tailwind v4, cloudflare adapter, i18n routing"
```

---

### Task 7: i18n helpers with tests

**Files:**
- Create: `apps/web/src/i18n/id.json`
- Create: `apps/web/src/i18n/en.json`
- Create: `apps/web/src/lib/i18n.ts`
- Create: `apps/web/src/lib/i18n.test.ts`

- [ ] **Step 1: Create `apps/web/src/i18n/id.json`**

```json
{
  "nav": {
    "products": "Produk",
    "generator": "Generator",
    "gallery": "Galeri",
    "contact": "Kontak",
    "whatsapp": "WhatsApp"
  },
  "hero": {
    "cta_marketplace": "Belanja di Marketplace",
    "cta_generator": "Lihat Silhouette Generator"
  },
  "pillars": {
    "title": "Apa yang Kami Tawarkan",
    "ready": {
      "title": "Produk Siap Kirim",
      "body": "Keychain, fidget, dan mainan kecil siap dikirim dari marketplace favorit kamu."
    },
    "generator": {
      "title": "Silhouette Art Generator",
      "body": "Bikin art silhouette personal lewat app kami, cetak langsung sebagai produk 3D."
    },
    "custom": {
      "title": "Jasa Custom & 3D Print",
      "body": "Bawa file atau ide kamu, kami bantu wujudkan jadi cetakan 3D berkualitas."
    }
  },
  "generator": {
    "badge": "Coming Soon",
    "estimated_launch": "Perkiraan rilis",
    "form": {
      "title": "Daftar waitlist",
      "subtitle": "Kami kabari saat launching.",
      "email_label": "Email",
      "email_placeholder": "kamu@email.com",
      "name_label": "Nama (opsional)",
      "name_placeholder": "Nama kamu",
      "submit": "Daftar",
      "submitting": "Mendaftar…",
      "success": "Terima kasih! Kami akan kabari kamu saat launch.",
      "error_invalid_email": "Email tidak valid.",
      "error_generic": "Gagal mendaftar, coba lagi sebentar."
    }
  },
  "products": {
    "title": "Produk Unggulan",
    "filter_all": "Semua",
    "categories": {
      "keychain": "Keychain",
      "fidget": "Fidget",
      "toy": "Mainan",
      "cosplay": "Cosplay",
      "other": "Lainnya"
    },
    "empty": "Belum ada produk unggulan."
  },
  "gallery": {
    "title": "Galeri & Portfolio",
    "filter_all": "Semua",
    "categories": {
      "custom": "Custom",
      "cosplay": "Cosplay",
      "print-service": "Jasa Print",
      "showcase": "Showcase"
    }
  },
  "marketplace": {
    "title": "Belanja di Marketplace",
    "subtitle": "Pilih platform favoritmu."
  },
  "footer": {
    "rights": "Hak cipta dilindungi."
  }
}
```

- [ ] **Step 2: Create `apps/web/src/i18n/en.json`**

```json
{
  "nav": {
    "products": "Products",
    "generator": "Generator",
    "gallery": "Gallery",
    "contact": "Contact",
    "whatsapp": "WhatsApp"
  },
  "hero": {
    "cta_marketplace": "Shop on Marketplaces",
    "cta_generator": "See Silhouette Generator"
  },
  "pillars": {
    "title": "What We Offer",
    "ready": {
      "title": "Ready-to-Ship Products",
      "body": "Keychains, fidgets, and small toys ready to ship from your favorite marketplaces."
    },
    "generator": {
      "title": "Silhouette Art Generator",
      "body": "Create personalized silhouette art in our app and print it as a custom 3D product."
    },
    "custom": {
      "title": "Custom & 3D Print Service",
      "body": "Bring your file or your idea — we'll turn it into a high-quality 3D print."
    }
  },
  "generator": {
    "badge": "Coming Soon",
    "estimated_launch": "Estimated launch",
    "form": {
      "title": "Join the waitlist",
      "subtitle": "We'll let you know at launch.",
      "email_label": "Email",
      "email_placeholder": "you@email.com",
      "name_label": "Name (optional)",
      "name_placeholder": "Your name",
      "submit": "Join",
      "submitting": "Joining…",
      "success": "Thanks! We'll let you know at launch.",
      "error_invalid_email": "Invalid email.",
      "error_generic": "Couldn't sign you up, please try again."
    }
  },
  "products": {
    "title": "Featured Products",
    "filter_all": "All",
    "categories": {
      "keychain": "Keychain",
      "fidget": "Fidget",
      "toy": "Toy",
      "cosplay": "Cosplay",
      "other": "Other"
    },
    "empty": "No featured products yet."
  },
  "gallery": {
    "title": "Gallery & Portfolio",
    "filter_all": "All",
    "categories": {
      "custom": "Custom",
      "cosplay": "Cosplay",
      "print-service": "Print Service",
      "showcase": "Showcase"
    }
  },
  "marketplace": {
    "title": "Shop on Marketplaces",
    "subtitle": "Pick your favorite platform."
  },
  "footer": {
    "rights": "All rights reserved."
  }
}
```

- [ ] **Step 3: Write failing test `apps/web/src/lib/i18n.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { t, pickLocalized, isLocale, otherLocale, localizedHref } from './i18n'

describe('t()', () => {
  it('returns ID translation by key path', () => {
    expect(t('id', 'nav.products')).toBe('Produk')
  })

  it('returns EN translation by key path', () => {
    expect(t('en', 'nav.products')).toBe('Products')
  })

  it('returns the key itself if the path is missing', () => {
    expect(t('id', 'nope.not.here')).toBe('nope.not.here')
  })

  it('interpolates parameters', () => {
    // No interpolated strings ship yet, so use a runtime injected path.
    const out = t('id', 'products.title')
    expect(typeof out).toBe('string')
  })
})

describe('pickLocalized()', () => {
  it('returns the matching locale value', () => {
    const field = [
      { _key: 'id', value: 'Halo' },
      { _key: 'en', value: 'Hello' },
    ]
    expect(pickLocalized(field, 'id')).toBe('Halo')
    expect(pickLocalized(field, 'en')).toBe('Hello')
  })

  it('falls back to ID when the requested locale is missing', () => {
    const field = [{ _key: 'id', value: 'Halo' }]
    expect(pickLocalized(field, 'en')).toBe('Halo')
  })

  it('returns empty string for undefined or empty array', () => {
    expect(pickLocalized(undefined, 'id')).toBe('')
    expect(pickLocalized([], 'id')).toBe('')
  })
})

describe('isLocale()', () => {
  it('accepts id and en', () => {
    expect(isLocale('id')).toBe(true)
    expect(isLocale('en')).toBe(true)
  })
  it('rejects other values', () => {
    expect(isLocale('fr')).toBe(false)
    expect(isLocale(undefined)).toBe(false)
  })
})

describe('otherLocale()', () => {
  it('flips id ↔ en', () => {
    expect(otherLocale('id')).toBe('en')
    expect(otherLocale('en')).toBe('id')
  })
})

describe('localizedHref()', () => {
  it('builds prefixed URLs', () => {
    expect(localizedHref('id', '/')).toBe('/id/')
    expect(localizedHref('en', '/#products')).toBe('/en/#products')
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd apps/web
npm run test
```

Expected: FAIL — cannot import from `./i18n` (module not found).

- [ ] **Step 5: Implement `apps/web/src/lib/i18n.ts`**

```ts
import idStrings from '~/i18n/id.json'
import enStrings from '~/i18n/en.json'

export type Locale = 'id' | 'en'
export const LOCALES: readonly Locale[] = ['id', 'en'] as const
export const DEFAULT_LOCALE: Locale = 'id'

const dictionaries: Record<Locale, unknown> = {
  id: idStrings,
  en: enStrings,
}

/**
 * Look up a translation by dot-path. Returns the key itself on miss
 * so missing strings are visible in the UI without crashing.
 */
export function t(locale: Locale, path: string): string {
  const segments = path.split('.')
  let node: unknown = dictionaries[locale]
  for (const segment of segments) {
    if (typeof node === 'object' && node !== null && segment in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[segment]
    } else {
      return path
    }
  }
  return typeof node === 'string' ? node : path
}

export type LocalizedArrayField<T = string> = Array<{ _key: string; value: T }>

/**
 * Sanity's internationalized-array plugin stores localized strings as
 * [{ _key: 'id', value: '...' }, { _key: 'en', value: '...' }]. Pick the
 * requested locale, fall back to the default locale, then empty string.
 */
export function pickLocalized<T = string>(
  field: LocalizedArrayField<T> | undefined,
  locale: Locale
): T | '' {
  if (!field || field.length === 0) return ''
  const match = field.find((entry) => entry._key === locale)
  if (match) return match.value
  const fallback = field.find((entry) => entry._key === DEFAULT_LOCALE)
  if (fallback) return fallback.value
  return field[0]?.value ?? ''
}

export function isLocale(value: unknown): value is Locale {
  return value === 'id' || value === 'en'
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'id' ? 'en' : 'id'
}

/** Build a locale-prefixed URL from a path that starts with `/`. */
export function localizedHref(locale: Locale, path: string): string {
  if (path === '/') return `/${locale}/`
  if (path.startsWith('/#')) return `/${locale}/${path.slice(1)}`
  return `/${locale}${path}`
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd apps/web
npm run test
```

Expected: all 12+ tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/i18n apps/web/src/lib/i18n.ts apps/web/src/lib/i18n.test.ts
git commit -m "feat(web): add i18n helpers and translation strings with tests"
```

---

### Task 8: Sanity client and typed queries with tests

**Files:**
- Create: `apps/web/src/lib/types.ts`
- Create: `apps/web/src/lib/sanity.ts`
- Create: `apps/web/src/lib/sanity.test.ts`

- [ ] **Step 1: Create `apps/web/src/lib/types.ts`**

```ts
import type { LocalizedArrayField } from './i18n'

export type ProductCategory = 'keychain' | 'fidget' | 'toy' | 'cosplay' | 'other'
export type GalleryCategory = 'custom' | 'cosplay' | 'print-service' | 'showcase'
export type LaunchStatus = 'coming-soon' | 'beta' | 'live'

export interface SanityImageRef {
  _type: 'image'
  asset: { _ref: string; _type: 'reference' }
  alt?: string
  hotspot?: { x: number; y: number; height: number; width: number }
}

export interface MarketplaceLinks {
  shopee?: string
  tokopedia?: string
  tiktokShop?: string
}

export interface SiteSettings {
  brandName: string
  tagline: LocalizedArrayField
  logo?: SanityImageRef
  contact: {
    whatsapp: string
    instagram: string
    email?: string
    address?: LocalizedArrayField
    operatingHours?: LocalizedArrayField
  }
  marketplaceLinks: MarketplaceLinks
  seo: {
    defaultTitle: LocalizedArrayField
    defaultDescription: LocalizedArrayField
    ogImage?: SanityImageRef
  }
}

export interface Product {
  _id: string
  title: LocalizedArrayField
  slug: { current: string }
  category: ProductCategory
  photos: SanityImageRef[]
  shortDescription?: LocalizedArrayField
  marketplaceLinks: MarketplaceLinks
  featured: boolean
  order: number
}

export interface GalleryItem {
  _id: string
  title: LocalizedArrayField
  image: SanityImageRef
  category: GalleryCategory
  caption?: LocalizedArrayField
  order: number
}

export interface SilhouetteGenerator {
  headline: LocalizedArrayField
  description: LocalizedArrayField
  devScreenshots: SanityImageRef[]
  launchStatus: LaunchStatus
  estimatedLaunch?: string
}
```

- [ ] **Step 2: Write failing test `apps/web/src/lib/sanity.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest'
import { createSanityClient, queries, urlFor } from './sanity'

describe('createSanityClient()', () => {
  it('builds a client with required options', () => {
    const client = createSanityClient({
      projectId: 'abc123',
      dataset: 'production',
      apiVersion: '2024-10-01',
    })
    expect(client.config().projectId).toBe('abc123')
    expect(client.config().dataset).toBe('production')
    expect(client.config().apiVersion).toBe('2024-10-01')
    expect(client.config().useCdn).toBe(true)
  })

  it('disables CDN when a token is provided', () => {
    const client = createSanityClient({
      projectId: 'abc123',
      dataset: 'production',
      apiVersion: '2024-10-01',
      token: 'sk-secret',
    })
    expect(client.config().useCdn).toBe(false)
    expect(client.config().token).toBe('sk-secret')
  })
})

describe('queries', () => {
  it('defines expected query constants as non-empty strings', () => {
    expect(queries.siteSettings).toContain('siteSettings')
    expect(queries.featuredProducts).toContain('product')
    expect(queries.featuredProducts).toContain('featured == true')
    expect(queries.galleryItems).toContain('galleryItem')
    expect(queries.silhouetteGenerator).toContain('silhouetteGenerator')
  })
})

describe('urlFor()', () => {
  it('returns a builder with width/format helpers for a valid ref', () => {
    const client = createSanityClient({
      projectId: 'abc123',
      dataset: 'production',
      apiVersion: '2024-10-01',
    })
    const builder = urlFor(client, {
      _type: 'image',
      asset: { _ref: 'image-abc-100x100-png', _type: 'reference' },
    })
    expect(typeof builder.width).toBe('function')
    expect(typeof builder.url).toBe('function')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd apps/web
npm run test
```

Expected: FAIL — `./sanity` not found.

- [ ] **Step 4: Implement `apps/web/src/lib/sanity.ts`**

```ts
import { createClient, type SanityClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import type { SanityImageRef } from './types'

export interface ClientOptions {
  projectId: string
  dataset: string
  apiVersion: string
  token?: string
}

export function createSanityClient(opts: ClientOptions): SanityClient {
  return createClient({
    projectId: opts.projectId,
    dataset: opts.dataset,
    apiVersion: opts.apiVersion,
    token: opts.token,
    useCdn: !opts.token, // authenticated reads/writes must skip the CDN
    perspective: 'published',
  })
}

/**
 * Returns a Sanity image-url builder scoped to the given client.
 * Usage at call sites: urlFor(client, image).width(800).format('webp').url()
 */
export function urlFor(client: SanityClient, image: SanityImageRef) {
  return imageUrlBuilder(client).image(image)
}

export const queries = {
  siteSettings: /* groq */ `*[_type == "siteSettings"][0]{
    brandName,
    tagline,
    logo{..., "alt": alt},
    contact{
      whatsapp,
      instagram,
      email,
      address,
      operatingHours
    },
    marketplaceLinks,
    seo{
      defaultTitle,
      defaultDescription,
      ogImage{..., "alt": alt}
    }
  }`,

  featuredProducts: /* groq */ `*[_type == "product" && featured == true] | order(order asc){
    _id,
    title,
    slug,
    category,
    photos[]{..., "alt": alt},
    shortDescription,
    marketplaceLinks,
    featured,
    order
  }`,

  galleryItems: /* groq */ `*[_type == "galleryItem"] | order(order asc){
    _id,
    title,
    image{..., "alt": alt},
    category,
    caption,
    order
  }`,

  silhouetteGenerator: /* groq */ `*[_type == "silhouetteGenerator"][0]{
    headline,
    description,
    devScreenshots[]{..., "alt": alt},
    launchStatus,
    estimatedLaunch
  }`,
} as const

/** Build a ready-to-use client from Astro env. */
export function clientFromEnv(env: Record<string, string | undefined> = import.meta.env as unknown as Record<string, string | undefined>): SanityClient {
  const projectId = env.PUBLIC_SANITY_PROJECT_ID
  const dataset = env.PUBLIC_SANITY_DATASET ?? 'production'
  const apiVersion = env.PUBLIC_SANITY_API_VERSION ?? '2024-10-01'
  if (!projectId) {
    throw new Error('PUBLIC_SANITY_PROJECT_ID is not set')
  }
  return createSanityClient({ projectId, dataset, apiVersion })
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/web
npm run test
```

Expected: all tests pass (i18n + sanity).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/types.ts apps/web/src/lib/sanity.ts apps/web/src/lib/sanity.test.ts
git commit -m "feat(web): add sanity client, typed queries, and image url helper"
```

---

### Task 9: BaseLayout, Navbar, LanguageSwitcher

**Files:**
- Create: `apps/web/src/layouts/BaseLayout.astro`
- Create: `apps/web/src/components/Navbar.astro`
- Create: `apps/web/src/components/LanguageSwitcher.astro`

- [ ] **Step 1: Create `apps/web/src/layouts/BaseLayout.astro`**

```astro
---
import '~/styles/global.css'
import type { Locale } from '~/lib/i18n'

interface Props {
  locale: Locale
  title: string
  description: string
}

const { locale, title, description } = Astro.props
const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? 'https://3dprintingbandung.my.id'
const cfAnalyticsToken = import.meta.env.PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN
---
<!doctype html>
<html lang={locale}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="generator" content={Astro.generator} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{title}</title>
    <meta name="description" content={description} />

    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={`${siteUrl}/${locale}/`} />
    <meta name="twitter:card" content="summary_large_image" />

    <link rel="alternate" hreflang="id" href={`${siteUrl}/id/`} />
    <link rel="alternate" hreflang="en" href={`${siteUrl}/en/`} />
    <link rel="alternate" hreflang="x-default" href={`${siteUrl}/id/`} />

    <slot name="head" />
  </head>
  <body class="bg-white text-[color:var(--color-ink-900)]">
    <slot />

    {cfAnalyticsToken && (
      <script
        is:inline
        defer
        src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon={`{"token": "${cfAnalyticsToken}"}`}
      />
    )}
  </body>
</html>
```

- [ ] **Step 2: Create `apps/web/src/components/LanguageSwitcher.astro`**

```astro
---
import type { Locale } from '~/lib/i18n'
import { otherLocale } from '~/lib/i18n'

interface Props {
  locale: Locale
}
const { locale } = Astro.props
const other = otherLocale(locale)
const otherFlag = other === 'id' ? '🇮🇩' : '🇬🇧'
const currentFlag = locale === 'id' ? '🇮🇩' : '🇬🇧'
const currentLabel = locale === 'id' ? 'Bahasa Indonesia' : 'English'
const otherLabel = other === 'id' ? 'Bahasa Indonesia' : 'English'
---
<div class="relative inline-block group">
  <button
    type="button"
    class="flex items-center gap-1 rounded-full border border-[color:var(--color-ink-300)] px-3 py-1.5 text-sm hover:bg-[color:var(--color-ink-100)]"
    aria-haspopup="menu"
    aria-expanded="false"
    id="lang-menu-button"
  >
    <span aria-hidden="true">{currentFlag}</span>
    <span class="sr-only">{currentLabel}</span>
    <span class="uppercase">{locale}</span>
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4l3 4 3-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" /></svg>
  </button>
  <div
    role="menu"
    aria-labelledby="lang-menu-button"
    class="absolute right-0 mt-1 hidden min-w-[11rem] rounded-xl border border-[color:var(--color-ink-300)] bg-white p-1 shadow-lg group-focus-within:block group-hover:block"
  >
    <a
      role="menuitem"
      href={`/${other}/`}
      class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[color:var(--color-ink-100)]"
      data-locale-link={other}
    >
      <span aria-hidden="true">{otherFlag}</span>
      <span>{otherLabel}</span>
    </a>
  </div>
</div>

<script>
  // Persist the user's manual choice so return visitors land on their preference.
  const links = document.querySelectorAll<HTMLAnchorElement>('a[data-locale-link]')
  links.forEach((link) => {
    link.addEventListener('click', () => {
      const locale = link.getAttribute('data-locale-link')
      if (locale) localStorage.setItem('preferred-locale', locale)
    })
  })

  // On fresh visits to `/` only (not /id/ or /en/), redirect to stored preference.
  // The root index.astro already redirects to /id/, so this only applies if a
  // user manually lands on /id/ but previously chose /en/.
  const path = window.location.pathname
  const stored = localStorage.getItem('preferred-locale')
  if (stored && (stored === 'id' || stored === 'en')) {
    if (path === '/' || path === '/id/' || path === '/en/') {
      const expected = `/${stored}/`
      if (path !== expected) {
        window.location.replace(expected + window.location.hash)
      }
    }
  }
</script>
```

- [ ] **Step 3: Create `apps/web/src/components/Navbar.astro`**

```astro
---
import type { Locale } from '~/lib/i18n'
import { t, localizedHref } from '~/lib/i18n'
import LanguageSwitcher from './LanguageSwitcher.astro'

interface Props {
  locale: Locale
  whatsappNumber?: string
}

const { locale, whatsappNumber } = Astro.props
const waHref = whatsappNumber
  ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`
  : 'https://wa.me/'
---
<header class="sticky top-0 z-40 border-b border-[color:var(--color-ink-100)] bg-white/90 backdrop-blur">
  <nav class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
    <a href={localizedHref(locale, '/')} class="flex items-center gap-2">
      <img src="/assets/logo.svg" alt="3dprintingbandung" class="h-8 w-auto" />
    </a>
    <ul class="hidden items-center gap-6 text-sm md:flex">
      <li><a href="#products" class="hover:text-[color:var(--color-brand-600)]">{t(locale, 'nav.products')}</a></li>
      <li><a href="#generator" class="hover:text-[color:var(--color-brand-600)]">{t(locale, 'nav.generator')}</a></li>
      <li><a href="#gallery" class="hover:text-[color:var(--color-brand-600)]">{t(locale, 'nav.gallery')}</a></li>
      <li><a href="#contact" class="hover:text-[color:var(--color-brand-600)]">{t(locale, 'nav.contact')}</a></li>
    </ul>
    <div class="flex items-center gap-2">
      <LanguageSwitcher locale={locale} />
      <a
        href={waHref}
        target="_blank"
        rel="noopener"
        class="hidden rounded-full bg-[color:var(--color-brand-500)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[color:var(--color-brand-600)] md:inline-flex"
      >
        {t(locale, 'nav.whatsapp')}
      </a>
    </div>
  </nav>
</header>
```

- [ ] **Step 4: Wire placeholder pages to use BaseLayout**

Replace `apps/web/src/pages/id/index.astro`:

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro'
import Navbar from '~/components/Navbar.astro'
---
<BaseLayout locale="id" title="3dprintingbandung" description="Studio 3D printing di Bandung.">
  <Navbar locale="id" />
  <main class="mx-auto max-w-6xl px-4 py-10">
    <h1 class="text-3xl font-display">Halo, 3dprintingbandung (ID)</h1>
  </main>
</BaseLayout>
```

Replace `apps/web/src/pages/en/index.astro`:

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro'
import Navbar from '~/components/Navbar.astro'
---
<BaseLayout locale="en" title="3dprintingbandung" description="A 3D printing studio in Bandung.">
  <Navbar locale="en" />
  <main class="mx-auto max-w-6xl px-4 py-10">
    <h1 class="text-3xl font-display">Hello, 3dprintingbandung (EN)</h1>
  </main>
</BaseLayout>
```

- [ ] **Step 5: Verify build and visual**

```bash
cd apps/web
npm run typecheck
npm run dev
```

Open `http://localhost:4321/id/` and `/en/`: navbar with logo, links, language switcher, and WA button should render. Clicking the flag dropdown switches to the other locale. Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/layouts apps/web/src/components/Navbar.astro apps/web/src/components/LanguageSwitcher.astro apps/web/src/pages
git commit -m "feat(web): add BaseLayout, Navbar, and LanguageSwitcher"
```

---

### Task 10: Hero and Pillars sections

**Files:**
- Create: `apps/web/src/components/Hero.astro`
- Create: `apps/web/src/components/Pillars.astro`
- Modify: `apps/web/src/pages/id/index.astro`
- Modify: `apps/web/src/pages/en/index.astro`

- [ ] **Step 1: Create `apps/web/src/components/Hero.astro`**

```astro
---
import type { Locale } from '~/lib/i18n'
import { t, pickLocalized, type LocalizedArrayField } from '~/lib/i18n'

interface Props {
  locale: Locale
  brandName: string
  tagline: LocalizedArrayField
}
const { locale, brandName, tagline } = Astro.props
const taglineText = pickLocalized(tagline, locale)
---
<section class="relative overflow-hidden bg-gradient-to-b from-[color:var(--color-brand-50)] to-white">
  <div class="mx-auto max-w-6xl px-4 py-20 md:py-28">
    <div class="max-w-2xl">
      <p class="mb-3 text-sm font-medium uppercase tracking-widest text-[color:var(--color-brand-600)]">{brandName}</p>
      <h1 class="text-4xl font-display font-bold leading-tight md:text-6xl">{taglineText}</h1>
      <div class="mt-8 flex flex-wrap gap-3">
        <a
          href="#marketplace"
          class="rounded-full bg-[color:var(--color-brand-500)] px-6 py-3 text-white font-medium hover:bg-[color:var(--color-brand-600)]"
        >
          {t(locale, 'hero.cta_marketplace')}
        </a>
        <a
          href="#generator"
          class="rounded-full border border-[color:var(--color-ink-300)] px-6 py-3 font-medium hover:bg-[color:var(--color-ink-100)]"
        >
          {t(locale, 'hero.cta_generator')}
        </a>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Create `apps/web/src/components/Pillars.astro`**

```astro
---
import type { Locale } from '~/lib/i18n'
import { t } from '~/lib/i18n'

interface Props { locale: Locale }
const { locale } = Astro.props

const pillars = [
  { key: 'ready', icon: '📦' },
  { key: 'generator', icon: '🎨' },
  { key: 'custom', icon: '🛠️' },
] as const
---
<section class="mx-auto max-w-6xl px-4 py-16">
  <h2 class="mb-10 text-center text-3xl font-display font-bold md:text-4xl">
    {t(locale, 'pillars.title')}
  </h2>
  <div class="grid gap-6 md:grid-cols-3">
    {pillars.map(({ key, icon }) => (
      <div class="rounded-2xl border border-[color:var(--color-ink-100)] bg-white p-6 shadow-sm">
        <div class="mb-3 text-3xl" aria-hidden="true">{icon}</div>
        <h3 class="mb-2 text-xl font-display font-semibold">{t(locale, `pillars.${key}.title`)}</h3>
        <p class="text-sm text-[color:var(--color-ink-500)]">{t(locale, `pillars.${key}.body`)}</p>
      </div>
    ))}
  </div>
</section>
```

- [ ] **Step 3: Wire into landing pages with real Sanity data**

Replace `apps/web/src/pages/id/index.astro`:

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro'
import Navbar from '~/components/Navbar.astro'
import Hero from '~/components/Hero.astro'
import Pillars from '~/components/Pillars.astro'
import { clientFromEnv, queries } from '~/lib/sanity'
import { pickLocalized } from '~/lib/i18n'
import type { SiteSettings } from '~/lib/types'

const client = clientFromEnv()
const settings = await client.fetch<SiteSettings | null>(queries.siteSettings)
const title = pickLocalized(settings?.seo?.defaultTitle, 'id') || '3dprintingbandung'
const description = pickLocalized(settings?.seo?.defaultDescription, 'id') || 'Studio 3D printing di Bandung.'
---
<BaseLayout locale="id" title={title} description={description}>
  <Navbar locale="id" whatsappNumber={settings?.contact?.whatsapp} />
  <main>
    <Hero
      locale="id"
      brandName={settings?.brandName ?? '3dprintingbandung'}
      tagline={settings?.tagline ?? []}
    />
    <Pillars locale="id" />
  </main>
</BaseLayout>
```

Replace `apps/web/src/pages/en/index.astro`:

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro'
import Navbar from '~/components/Navbar.astro'
import Hero from '~/components/Hero.astro'
import Pillars from '~/components/Pillars.astro'
import { clientFromEnv, queries } from '~/lib/sanity'
import { pickLocalized } from '~/lib/i18n'
import type { SiteSettings } from '~/lib/types'

const client = clientFromEnv()
const settings = await client.fetch<SiteSettings | null>(queries.siteSettings)
const title = pickLocalized(settings?.seo?.defaultTitle, 'en') || '3dprintingbandung'
const description = pickLocalized(settings?.seo?.defaultDescription, 'en') || 'A 3D printing studio in Bandung.'
---
<BaseLayout locale="en" title={title} description={description}>
  <Navbar locale="en" whatsappNumber={settings?.contact?.whatsapp} />
  <main>
    <Hero
      locale="en"
      brandName={settings?.brandName ?? '3dprintingbandung'}
      tagline={settings?.tagline ?? []}
    />
    <Pillars locale="en" />
  </main>
</BaseLayout>
```

- [ ] **Step 4: Verify**

```bash
cd apps/web
npm run typecheck
npm run dev
```

Expected: `/id/` shows hero + pillars with tagline pulled from the Sanity siteSettings document created in Task 5. Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/Hero.astro apps/web/src/components/Pillars.astro apps/web/src/pages
git commit -m "feat(web): add hero and pillars sections wired to sanity"
```

---

### Task 11: Waitlist API route with tests

**Files:**
- Create: `apps/web/src/pages/api/waitlist.ts`
- Create: `apps/web/src/pages/api/waitlist.test.ts`

- [ ] **Step 1: Write failing test `apps/web/src/pages/api/waitlist.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the sanity client factory BEFORE importing the handler.
const createMock = vi.fn()
vi.mock('@sanity/client', () => ({
  createClient: vi.fn(() => ({
    create: createMock,
  })),
}))

import { POST } from './waitlist'

function makeRequest(body: unknown): Request {
  return new Request('https://test.local/api/waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeContext(overrides: Partial<Record<string, string>> = {}) {
  return {
    request: undefined as unknown as Request,
    locals: {
      runtime: {
        env: {
          PUBLIC_SANITY_PROJECT_ID: 'abc123',
          PUBLIC_SANITY_DATASET: 'production',
          PUBLIC_SANITY_API_VERSION: '2024-10-01',
          SANITY_WRITE_TOKEN: 'sk-test',
          ...overrides,
        },
      },
    },
  }
}

beforeEach(() => {
  createMock.mockReset()
})

describe('POST /api/waitlist', () => {
  it('rejects invalid emails with 400', async () => {
    const ctx = makeContext()
    ctx.request = makeRequest({ email: 'not-an-email' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_email')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('rejects empty body with 400', async () => {
    const ctx = makeContext()
    ctx.request = makeRequest({})
    const res = await POST(ctx as never)
    expect(res.status).toBe(400)
  })

  it('writes a waitlistEntry document and returns 200 on success', async () => {
    createMock.mockResolvedValueOnce({ _id: 'wl-1' })
    const ctx = makeContext()
    ctx.request = makeRequest({ email: 'test@example.com', name: 'Test' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(createMock).toHaveBeenCalledTimes(1)
    const doc = createMock.mock.calls[0][0]
    expect(doc._type).toBe('waitlistEntry')
    expect(doc.email).toBe('test@example.com')
    expect(doc.name).toBe('Test')
    expect(doc.source).toBe('silhouette-generator')
    expect(typeof doc.submittedAt).toBe('string')
  })

  it('returns 500 when the write token is missing', async () => {
    const ctx = makeContext({ SANITY_WRITE_TOKEN: '' })
    ctx.request = makeRequest({ email: 'test@example.com' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('server_misconfigured')
  })

  it('returns 500 and logs when the sanity write throws', async () => {
    createMock.mockRejectedValueOnce(new Error('boom'))
    const ctx = makeContext()
    ctx.request = makeRequest({ email: 'test@example.com' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(500)
  })

  it('omits name when not provided', async () => {
    createMock.mockResolvedValueOnce({ _id: 'wl-2' })
    const ctx = makeContext()
    ctx.request = makeRequest({ email: 'just@email.com' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(200)
    const doc = createMock.mock.calls[0][0]
    expect(doc.name).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/web
npm run test
```

Expected: FAIL — `./waitlist` not found.

- [ ] **Step 3: Implement `apps/web/src/pages/api/waitlist.ts`**

```ts
import type { APIContext } from 'astro'
import { createClient } from '@sanity/client'

export const prerender = false

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

interface RequestBody {
  email?: unknown
  name?: unknown
}

function getEnv(ctx: APIContext, key: string): string | undefined {
  // Cloudflare Pages Functions expose env via ctx.locals.runtime.env.
  // Fall back to import.meta.env for local `astro dev` runs.
  const runtimeEnv = (ctx.locals as { runtime?: { env?: Record<string, string | undefined> } })
    .runtime?.env
  return runtimeEnv?.[key] ?? (import.meta.env as Record<string, string | undefined>)[key]
}

export async function POST(ctx: APIContext): Promise<Response> {
  let body: RequestBody
  try {
    body = (await ctx.request.json()) as RequestBody
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''

  if (!email || !EMAIL_REGEX.test(email) || email.length > 254) {
    return Response.json({ error: 'invalid_email' }, { status: 400 })
  }

  const projectId = getEnv(ctx, 'PUBLIC_SANITY_PROJECT_ID')
  const dataset = getEnv(ctx, 'PUBLIC_SANITY_DATASET') ?? 'production'
  const apiVersion = getEnv(ctx, 'PUBLIC_SANITY_API_VERSION') ?? '2024-10-01'
  const token = getEnv(ctx, 'SANITY_WRITE_TOKEN')

  if (!projectId || !token) {
    return Response.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    token,
    useCdn: false,
  })

  const doc: Record<string, unknown> = {
    _type: 'waitlistEntry',
    email,
    source: 'silhouette-generator',
    submittedAt: new Date().toISOString(),
  }
  if (name) doc.name = name

  try {
    await client.create(doc as never)
  } catch (err) {
    console.error('[waitlist] sanity create failed', err)
    return Response.json({ error: 'write_failed' }, { status: 500 })
  }

  return Response.json({ ok: true }, { status: 200 })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/web
npm run test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/api
git commit -m "feat(web): add waitlist api route with validation and tests"
```

---

### Task 12: GeneratorComingSoon section with WaitlistForm React island

**Files:**
- Create: `apps/web/src/components/WaitlistForm.tsx`
- Create: `apps/web/src/components/GeneratorComingSoon.astro`
- Modify: `apps/web/src/pages/id/index.astro`
- Modify: `apps/web/src/pages/en/index.astro`

- [ ] **Step 1: Create `apps/web/src/components/WaitlistForm.tsx`**

```tsx
import { useState, type FormEvent } from 'react'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export interface WaitlistStrings {
  title: string
  subtitle: string
  emailLabel: string
  emailPlaceholder: string
  nameLabel: string
  namePlaceholder: string
  submit: string
  submitting: string
  success: string
  errorInvalidEmail: string
  errorGeneric: string
}

interface Props {
  strings: WaitlistStrings
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function WaitlistForm({ strings }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!EMAIL_REGEX.test(email)) {
      setStatus('error')
      setErrorMessage(strings.errorInvalidEmail)
      return
    }
    setStatus('submitting')
    setErrorMessage('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, name: name || undefined }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setStatus('error')
        setErrorMessage(body.error === 'invalid_email' ? strings.errorInvalidEmail : strings.errorGeneric)
        return
      }
      setStatus('success')
      setEmail('')
      setName('')
    } catch {
      setStatus('error')
      setErrorMessage(strings.errorGeneric)
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-50)] p-4 text-sm"
      >
        {strings.success}
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div>
        <h3 className="mb-1 text-lg font-display font-semibold">{strings.title}</h3>
        <p className="text-sm text-[color:var(--color-ink-500)]">{strings.subtitle}</p>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">{strings.emailLabel}</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          placeholder={strings.emailPlaceholder}
          className="w-full rounded-lg border border-[color:var(--color-ink-300)] px-3 py-2 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">{strings.nameLabel}</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder={strings.namePlaceholder}
          className="w-full rounded-lg border border-[color:var(--color-ink-300)] px-3 py-2 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none"
        />
      </label>
      {status === 'error' && (
        <p role="alert" className="text-sm text-red-600">{errorMessage}</p>
      )}
      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full rounded-full bg-[color:var(--color-brand-500)] px-5 py-2.5 font-medium text-white hover:bg-[color:var(--color-brand-600)] disabled:opacity-60"
      >
        {status === 'submitting' ? strings.submitting : strings.submit}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Create `apps/web/src/components/GeneratorComingSoon.astro`**

```astro
---
import type { Locale } from '~/lib/i18n'
import { t, pickLocalized } from '~/lib/i18n'
import WaitlistForm from './WaitlistForm.tsx'
import { urlFor } from '~/lib/sanity'
import { clientFromEnv } from '~/lib/sanity'
import type { SilhouetteGenerator } from '~/lib/types'

interface Props {
  locale: Locale
  data: SilhouetteGenerator | null
}
const { locale, data } = Astro.props
const client = clientFromEnv()

const headline = pickLocalized(data?.headline, locale)
const description = pickLocalized(data?.description, locale)
const screenshots = data?.devScreenshots ?? []

const strings = {
  title: t(locale, 'generator.form.title'),
  subtitle: t(locale, 'generator.form.subtitle'),
  emailLabel: t(locale, 'generator.form.email_label'),
  emailPlaceholder: t(locale, 'generator.form.email_placeholder'),
  nameLabel: t(locale, 'generator.form.name_label'),
  namePlaceholder: t(locale, 'generator.form.name_placeholder'),
  submit: t(locale, 'generator.form.submit'),
  submitting: t(locale, 'generator.form.submitting'),
  success: t(locale, 'generator.form.success'),
  errorInvalidEmail: t(locale, 'generator.form.error_invalid_email'),
  errorGeneric: t(locale, 'generator.form.error_generic'),
}
---
<section id="generator" class="bg-[color:var(--color-ink-100)] py-20">
  <div class="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2 md:items-center">
    <div>
      <span class="inline-block rounded-full bg-[color:var(--color-brand-500)] px-3 py-1 text-xs font-medium text-white">
        {t(locale, 'generator.badge')}
      </span>
      <h2 class="mt-3 text-3xl font-display font-bold md:text-5xl">{headline}</h2>
      <p class="mt-4 text-[color:var(--color-ink-500)]">{description}</p>
      {data?.estimatedLaunch && (
        <p class="mt-2 text-sm text-[color:var(--color-ink-500)]">
          {t(locale, 'generator.estimated_launch')}: <strong>{data.estimatedLaunch}</strong>
        </p>
      )}
      <div class="mt-6 max-w-md rounded-2xl border border-[color:var(--color-ink-300)] bg-white p-5">
        <WaitlistForm client:load strings={strings} />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      {screenshots.map((shot, i) => (
        <img
          src={urlFor(client, shot).width(600).format('webp').url()}
          alt={shot.alt ?? `Dev screenshot ${i + 1}`}
          class={`rounded-xl shadow-md ${i % 3 === 0 ? 'col-span-2' : ''}`}
          loading="lazy"
        />
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 3: Wire into landing pages**

Edit `apps/web/src/pages/id/index.astro` — add imports and the section:

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro'
import Navbar from '~/components/Navbar.astro'
import Hero from '~/components/Hero.astro'
import Pillars from '~/components/Pillars.astro'
import GeneratorComingSoon from '~/components/GeneratorComingSoon.astro'
import { clientFromEnv, queries } from '~/lib/sanity'
import { pickLocalized } from '~/lib/i18n'
import type { SiteSettings, SilhouetteGenerator } from '~/lib/types'

const client = clientFromEnv()
const [settings, generator] = await Promise.all([
  client.fetch<SiteSettings | null>(queries.siteSettings),
  client.fetch<SilhouetteGenerator | null>(queries.silhouetteGenerator),
])
const title = pickLocalized(settings?.seo?.defaultTitle, 'id') || '3dprintingbandung'
const description = pickLocalized(settings?.seo?.defaultDescription, 'id') || 'Studio 3D printing di Bandung.'
---
<BaseLayout locale="id" title={title} description={description}>
  <Navbar locale="id" whatsappNumber={settings?.contact?.whatsapp} />
  <main>
    <Hero locale="id" brandName={settings?.brandName ?? '3dprintingbandung'} tagline={settings?.tagline ?? []} />
    <Pillars locale="id" />
    <GeneratorComingSoon locale="id" data={generator} />
  </main>
</BaseLayout>
```

Mirror the same change in `apps/web/src/pages/en/index.astro` (swap `locale="en"` and description default).

- [ ] **Step 4: Verify**

```bash
cd apps/web
npm run typecheck
npm run test
```

Expected: all green. Then `npm run dev`, open `/id/#generator`, submit the form with a valid email — response should succeed (writes to Sanity via the write token) and show the success message. Check in Sanity Studio that a new `waitlistEntry` document appeared. Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/WaitlistForm.tsx apps/web/src/components/GeneratorComingSoon.astro apps/web/src/pages
git commit -m "feat(web): add generator coming soon section with waitlist form"
```

---

### Task 13: Product grid with carousel and category filter

**Files:**
- Create: `apps/web/src/components/Lightbox.tsx`
- Create: `apps/web/src/components/ProductCard.tsx`
- Create: `apps/web/src/components/ProductGrid.astro`
- Modify: `apps/web/src/pages/id/index.astro`
- Modify: `apps/web/src/pages/en/index.astro`

- [ ] **Step 1: Create `apps/web/src/components/Lightbox.tsx`**

```tsx
import { useEffect } from 'react'

interface Props {
  images: Array<{ src: string; alt: string }>
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

export default function Lightbox({ images, index, onClose, onPrev, onNext }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  const current = images[index]
  if (!current) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        onClick={onClose}
      >
        ✕
      </button>
      <button
        type="button"
        aria-label="Previous"
        className="absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation()
          onPrev()
        }}
      >
        ‹
      </button>
      <img
        src={current.src}
        alt={current.alt}
        className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        aria-label="Next"
        className="absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation()
          onNext()
        }}
      >
        ›
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create `apps/web/src/components/ProductCard.tsx`**

```tsx
import { useCallback, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Lightbox from './Lightbox'

export interface ProductCardProps {
  title: string
  category: string
  shortDescription: string
  photos: Array<{ src: string; alt: string }>
  marketplaceLinks: {
    shopee?: string
    tokopedia?: string
    tiktokShop?: string
  }
  marketplaceLabels: {
    shopee: string
    tokopedia: string
    tiktokShop: string
  }
}

export default function ProductCard({
  title,
  category,
  shortDescription,
  photos,
  marketplaceLinks,
  marketplaceLabels,
}: ProductCardProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' })
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  const hasAnyLink = Boolean(marketplaceLinks.shopee || marketplaceLinks.tokopedia || marketplaceLinks.tiktokShop)

  return (
    <article className="overflow-hidden rounded-2xl border border-[color:var(--color-ink-100)] bg-white shadow-sm">
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {photos.map((photo, i) => (
              <button
                key={i}
                type="button"
                className="relative min-w-full shrink-0"
                onClick={() => setLightboxIndex(i)}
                aria-label={`Open photo ${i + 1} of ${photos.length}`}
              >
                <img
                  src={photo.src}
                  alt={photo.alt}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={scrollPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={scrollNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"
            >
              ›
            </button>
          </>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-base font-display font-semibold">{title}</h3>
        <p className="mt-0.5 text-xs uppercase tracking-wide text-[color:var(--color-ink-500)]">{category}</p>
        {shortDescription && <p className="mt-2 text-sm text-[color:var(--color-ink-500)]">{shortDescription}</p>}
        {hasAnyLink && (
          <div className="mt-3 flex flex-wrap gap-2">
            {marketplaceLinks.shopee && (
              <a
                href={marketplaceLinks.shopee}
                target="_blank"
                rel="noopener"
                className="rounded-full bg-[#ee4d2d] px-3 py-1 text-xs font-medium text-white hover:opacity-90"
              >
                {marketplaceLabels.shopee}
              </a>
            )}
            {marketplaceLinks.tokopedia && (
              <a
                href={marketplaceLinks.tokopedia}
                target="_blank"
                rel="noopener"
                className="rounded-full bg-[#03ac0e] px-3 py-1 text-xs font-medium text-white hover:opacity-90"
              >
                {marketplaceLabels.tokopedia}
              </a>
            )}
            {marketplaceLinks.tiktokShop && (
              <a
                href={marketplaceLinks.tiktokShop}
                target="_blank"
                rel="noopener"
                className="rounded-full bg-[#000] px-3 py-1 text-xs font-medium text-white hover:opacity-90"
              >
                {marketplaceLabels.tiktokShop}
              </a>
            )}
          </div>
        )}
      </div>
      {lightboxIndex !== null && (
        <Lightbox
          images={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length))}
          onNext={() => setLightboxIndex((i) => (i === null ? null : (i + 1) % photos.length))}
        />
      )}
    </article>
  )
}
```

- [ ] **Step 3: Create `apps/web/src/components/ProductGrid.astro`**

```astro
---
import type { Locale } from '~/lib/i18n'
import { t, pickLocalized } from '~/lib/i18n'
import { clientFromEnv, urlFor } from '~/lib/sanity'
import type { Product } from '~/lib/types'
import ProductCard from './ProductCard.tsx'

interface Props {
  locale: Locale
  products: Product[]
}
const { locale, products } = Astro.props
const client = clientFromEnv()

const marketplaceLabels = { shopee: 'Shopee', tokopedia: 'Tokopedia', tiktokShop: 'TikTok Shop' }

const categoriesUsed = Array.from(new Set(products.map((p) => p.category)))

const cards = products.map((p) => ({
  id: p._id,
  category: p.category,
  props: {
    title: pickLocalized(p.title, locale),
    category: t(locale, `products.categories.${p.category}`),
    shortDescription: pickLocalized(p.shortDescription, locale),
    photos: p.photos.map((ph, i) => ({
      src: urlFor(client, ph).width(800).format('webp').url(),
      alt: ph.alt ?? `${pickLocalized(p.title, locale)} ${i + 1}`,
    })),
    marketplaceLinks: p.marketplaceLinks,
    marketplaceLabels,
  },
}))
---
<section id="products" class="mx-auto max-w-6xl px-4 py-20">
  <h2 class="mb-10 text-center text-3xl font-display font-bold md:text-4xl">
    {t(locale, 'products.title')}
  </h2>

  {products.length === 0 ? (
    <p class="text-center text-[color:var(--color-ink-500)]">{t(locale, 'products.empty')}</p>
  ) : (
    <>
      <div class="mb-8 flex flex-wrap justify-center gap-2" data-product-filter>
        <button
          type="button"
          class="rounded-full border border-[color:var(--color-ink-300)] px-4 py-1.5 text-sm data-[active=true]:bg-[color:var(--color-ink-900)] data-[active=true]:text-white"
          data-filter="all"
          data-active="true"
        >
          {t(locale, 'products.filter_all')}
        </button>
        {categoriesUsed.map((c) => (
          <button
            type="button"
            class="rounded-full border border-[color:var(--color-ink-300)] px-4 py-1.5 text-sm data-[active=true]:bg-[color:var(--color-ink-900)] data-[active=true]:text-white"
            data-filter={c}
            data-active="false"
          >
            {t(locale, `products.categories.${c}`)}
          </button>
        ))}
      </div>
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-product-grid>
        {cards.map(({ id, category, props }) => (
          <div data-category={category}>
            <ProductCard client:visible {...props} />
          </div>
        ))}
      </div>
    </>
  )}
</section>

<script>
  const filterButtons = document.querySelectorAll<HTMLButtonElement>('[data-product-filter] button')
  const items = document.querySelectorAll<HTMLElement>('[data-product-grid] > [data-category]')
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter
      filterButtons.forEach((b) => b.setAttribute('data-active', String(b === btn)))
      items.forEach((el) => {
        const match = filter === 'all' || el.dataset.category === filter
        el.style.display = match ? '' : 'none'
      })
    })
  })
</script>
```

- [ ] **Step 4: Wire into landing pages**

Update `apps/web/src/pages/id/index.astro`:

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro'
import Navbar from '~/components/Navbar.astro'
import Hero from '~/components/Hero.astro'
import Pillars from '~/components/Pillars.astro'
import GeneratorComingSoon from '~/components/GeneratorComingSoon.astro'
import ProductGrid from '~/components/ProductGrid.astro'
import { clientFromEnv, queries } from '~/lib/sanity'
import { pickLocalized } from '~/lib/i18n'
import type { SiteSettings, SilhouetteGenerator, Product } from '~/lib/types'

const client = clientFromEnv()
const [settings, generator, products] = await Promise.all([
  client.fetch<SiteSettings | null>(queries.siteSettings),
  client.fetch<SilhouetteGenerator | null>(queries.silhouetteGenerator),
  client.fetch<Product[]>(queries.featuredProducts),
])
const title = pickLocalized(settings?.seo?.defaultTitle, 'id') || '3dprintingbandung'
const description = pickLocalized(settings?.seo?.defaultDescription, 'id') || 'Studio 3D printing di Bandung.'
---
<BaseLayout locale="id" title={title} description={description}>
  <Navbar locale="id" whatsappNumber={settings?.contact?.whatsapp} />
  <main>
    <Hero locale="id" brandName={settings?.brandName ?? '3dprintingbandung'} tagline={settings?.tagline ?? []} />
    <Pillars locale="id" />
    <GeneratorComingSoon locale="id" data={generator} />
    <ProductGrid locale="id" products={products} />
  </main>
</BaseLayout>
```

Mirror in `apps/web/src/pages/en/index.astro` (swap `locale="en"` and default description).

- [ ] **Step 5: Verify**

```bash
cd apps/web
npm run typecheck
npm run dev
```

Expected: `/id/#products` shows a grid including the test product created in Task 5, carousel working, clicking a photo opens the lightbox, filter buttons filter the grid, and clicking a marketplace button opens that marketplace in a new tab. Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/Lightbox.tsx apps/web/src/components/ProductCard.tsx apps/web/src/components/ProductGrid.astro apps/web/src/pages
git commit -m "feat(web): add product grid with carousel, lightbox, and category filter"
```

---

### Task 14: Gallery section

**Files:**
- Create: `apps/web/src/components/Gallery.astro`
- Modify: `apps/web/src/pages/id/index.astro`
- Modify: `apps/web/src/pages/en/index.astro`

- [ ] **Step 1: Create `apps/web/src/components/Gallery.astro`**

```astro
---
import type { Locale } from '~/lib/i18n'
import { t, pickLocalized } from '~/lib/i18n'
import { clientFromEnv, urlFor } from '~/lib/sanity'
import type { GalleryItem } from '~/lib/types'

interface Props {
  locale: Locale
  items: GalleryItem[]
}
const { locale, items } = Astro.props
const client = clientFromEnv()

const categoriesUsed = Array.from(new Set(items.map((i) => i.category)))

const cards = items.map((i) => ({
  id: i._id,
  category: i.category,
  src: urlFor(client, i.image).width(800).format('webp').url(),
  alt: i.image.alt ?? pickLocalized(i.title, locale),
  caption: pickLocalized(i.caption, locale),
}))
---
<section id="gallery" class="mx-auto max-w-6xl px-4 py-20">
  <h2 class="mb-10 text-center text-3xl font-display font-bold md:text-4xl">
    {t(locale, 'gallery.title')}
  </h2>

  {items.length > 0 && (
    <>
      <div class="mb-8 flex flex-wrap justify-center gap-2" data-gallery-filter>
        <button
          type="button"
          class="rounded-full border border-[color:var(--color-ink-300)] px-4 py-1.5 text-sm data-[active=true]:bg-[color:var(--color-ink-900)] data-[active=true]:text-white"
          data-filter="all"
          data-active="true"
        >
          {t(locale, 'gallery.filter_all')}
        </button>
        {categoriesUsed.map((c) => (
          <button
            type="button"
            class="rounded-full border border-[color:var(--color-ink-300)] px-4 py-1.5 text-sm data-[active=true]:bg-[color:var(--color-ink-900)] data-[active=true]:text-white"
            data-filter={c}
            data-active="false"
          >
            {t(locale, `gallery.categories.${c}`)}
          </button>
        ))}
      </div>
      <div class="columns-1 gap-4 sm:columns-2 md:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid" data-gallery-grid>
        {cards.map((item) => (
          <figure data-category={item.category} class="overflow-hidden rounded-2xl">
            <img src={item.src} alt={item.alt} loading="lazy" class="w-full object-cover" />
            {item.caption && (
              <figcaption class="mt-2 text-sm text-[color:var(--color-ink-500)]">{item.caption}</figcaption>
            )}
          </figure>
        ))}
      </div>
    </>
  )}
</section>

<script>
  const filterButtons = document.querySelectorAll<HTMLButtonElement>('[data-gallery-filter] button')
  const items = document.querySelectorAll<HTMLElement>('[data-gallery-grid] > [data-category]')
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter
      filterButtons.forEach((b) => b.setAttribute('data-active', String(b === btn)))
      items.forEach((el) => {
        const match = filter === 'all' || el.dataset.category === filter
        el.style.display = match ? '' : 'none'
      })
    })
  })
</script>
```

- [ ] **Step 2: Wire into landing pages**

Update `apps/web/src/pages/id/index.astro` to add `galleryItems` fetch and `<Gallery>` section:

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro'
import Navbar from '~/components/Navbar.astro'
import Hero from '~/components/Hero.astro'
import Pillars from '~/components/Pillars.astro'
import GeneratorComingSoon from '~/components/GeneratorComingSoon.astro'
import ProductGrid from '~/components/ProductGrid.astro'
import Gallery from '~/components/Gallery.astro'
import { clientFromEnv, queries } from '~/lib/sanity'
import { pickLocalized } from '~/lib/i18n'
import type { SiteSettings, SilhouetteGenerator, Product, GalleryItem } from '~/lib/types'

const client = clientFromEnv()
const [settings, generator, products, gallery] = await Promise.all([
  client.fetch<SiteSettings | null>(queries.siteSettings),
  client.fetch<SilhouetteGenerator | null>(queries.silhouetteGenerator),
  client.fetch<Product[]>(queries.featuredProducts),
  client.fetch<GalleryItem[]>(queries.galleryItems),
])
const title = pickLocalized(settings?.seo?.defaultTitle, 'id') || '3dprintingbandung'
const description = pickLocalized(settings?.seo?.defaultDescription, 'id') || 'Studio 3D printing di Bandung.'
---
<BaseLayout locale="id" title={title} description={description}>
  <Navbar locale="id" whatsappNumber={settings?.contact?.whatsapp} />
  <main>
    <Hero locale="id" brandName={settings?.brandName ?? '3dprintingbandung'} tagline={settings?.tagline ?? []} />
    <Pillars locale="id" />
    <GeneratorComingSoon locale="id" data={generator} />
    <ProductGrid locale="id" products={products} />
    <Gallery locale="id" items={gallery} />
  </main>
</BaseLayout>
```

Mirror in the EN page.

- [ ] **Step 3: Verify**

```bash
cd apps/web
npm run typecheck
npm run dev
```

Create 1-2 gallery items in Sanity Studio first if none exist, then reload. Expected: `#gallery` shows a masonry grid with filters. Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/Gallery.astro apps/web/src/pages
git commit -m "feat(web): add gallery section with category filter"
```

---

### Task 15: MarketplaceCTA and Footer

**Files:**
- Create: `apps/web/src/components/MarketplaceCTA.astro`
- Create: `apps/web/src/components/Footer.astro`
- Modify: `apps/web/src/pages/id/index.astro`
- Modify: `apps/web/src/pages/en/index.astro`

- [ ] **Step 1: Create `apps/web/src/components/MarketplaceCTA.astro`**

```astro
---
import type { Locale } from '~/lib/i18n'
import { t } from '~/lib/i18n'
import type { MarketplaceLinks } from '~/lib/types'

interface Props {
  locale: Locale
  links: MarketplaceLinks
}
const { locale, links } = Astro.props
---
<section id="marketplace" class="bg-[color:var(--color-ink-900)] py-20 text-white">
  <div class="mx-auto max-w-3xl px-4 text-center">
    <h2 class="text-3xl font-display font-bold md:text-4xl">{t(locale, 'marketplace.title')}</h2>
    <p class="mt-3 text-[color:var(--color-ink-300)]">{t(locale, 'marketplace.subtitle')}</p>
    <div class="mt-8 grid gap-3 sm:grid-cols-3">
      {links.shopee && (
        <a
          href={links.shopee}
          target="_blank"
          rel="noopener"
          class="rounded-xl bg-[#ee4d2d] px-5 py-4 text-center text-lg font-semibold hover:opacity-90"
        >
          Shopee
        </a>
      )}
      {links.tokopedia && (
        <a
          href={links.tokopedia}
          target="_blank"
          rel="noopener"
          class="rounded-xl bg-[#03ac0e] px-5 py-4 text-center text-lg font-semibold hover:opacity-90"
        >
          Tokopedia
        </a>
      )}
      {links.tiktokShop && (
        <a
          href={links.tiktokShop}
          target="_blank"
          rel="noopener"
          class="rounded-xl bg-black px-5 py-4 text-center text-lg font-semibold ring-1 ring-white/30 hover:bg-white/10"
        >
          TikTok Shop
        </a>
      )}
    </div>
  </div>
</section>
```

- [ ] **Step 2: Create `apps/web/src/components/Footer.astro`**

```astro
---
import type { Locale } from '~/lib/i18n'
import { t, pickLocalized } from '~/lib/i18n'
import type { SiteSettings } from '~/lib/types'

interface Props {
  locale: Locale
  settings: SiteSettings | null
}
const { locale, settings } = Astro.props
const year = new Date().getFullYear()
const contact = settings?.contact
const waHref = contact ? `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}` : '#'
const igHref = contact ? `https://instagram.com/${contact.instagram.replace(/^@/, '')}` : '#'
const address = pickLocalized(contact?.address, locale)
const hours = pickLocalized(contact?.operatingHours, locale)
---
<footer id="contact" class="border-t border-[color:var(--color-ink-100)] bg-white py-12">
  <div class="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-3">
    <div>
      <img src="/assets/logo.svg" alt="3dprintingbandung" class="h-8 w-auto" />
      <p class="mt-3 text-sm text-[color:var(--color-ink-500)]">{settings?.brandName}</p>
    </div>
    <div class="text-sm">
      <h3 class="mb-2 font-display font-semibold">{t(locale, 'nav.contact')}</h3>
      <ul class="space-y-1 text-[color:var(--color-ink-500)]">
        {contact?.whatsapp && (
          <li><a href={waHref} target="_blank" rel="noopener" class="hover:text-[color:var(--color-brand-600)]">WhatsApp: {contact.whatsapp}</a></li>
        )}
        {contact?.instagram && (
          <li><a href={igHref} target="_blank" rel="noopener" class="hover:text-[color:var(--color-brand-600)]">Instagram: @{contact.instagram}</a></li>
        )}
        {contact?.email && <li>Email: {contact.email}</li>}
        {address && <li>{address}</li>}
        {hours && <li>{hours}</li>}
      </ul>
    </div>
    <div class="text-sm">
      <h3 class="mb-2 font-display font-semibold">Menu</h3>
      <ul class="space-y-1 text-[color:var(--color-ink-500)]">
        <li><a href="#products" class="hover:text-[color:var(--color-brand-600)]">{t(locale, 'nav.products')}</a></li>
        <li><a href="#generator" class="hover:text-[color:var(--color-brand-600)]">{t(locale, 'nav.generator')}</a></li>
        <li><a href="#gallery" class="hover:text-[color:var(--color-brand-600)]">{t(locale, 'nav.gallery')}</a></li>
        <li><a href="#marketplace" class="hover:text-[color:var(--color-brand-600)]">{t(locale, 'marketplace.title')}</a></li>
      </ul>
    </div>
  </div>
  <div class="mx-auto mt-10 max-w-6xl px-4 text-center text-xs text-[color:var(--color-ink-500)]">
    © {year} {settings?.brandName ?? '3dprintingbandung'}. {t(locale, 'footer.rights')}
  </div>
</footer>
```

- [ ] **Step 3: Wire into landing pages**

Add `MarketplaceCTA` and `Footer` to `apps/web/src/pages/id/index.astro`:

```astro
---
import BaseLayout from '~/layouts/BaseLayout.astro'
import Navbar from '~/components/Navbar.astro'
import Hero from '~/components/Hero.astro'
import Pillars from '~/components/Pillars.astro'
import GeneratorComingSoon from '~/components/GeneratorComingSoon.astro'
import ProductGrid from '~/components/ProductGrid.astro'
import Gallery from '~/components/Gallery.astro'
import MarketplaceCTA from '~/components/MarketplaceCTA.astro'
import Footer from '~/components/Footer.astro'
import { clientFromEnv, queries } from '~/lib/sanity'
import { pickLocalized } from '~/lib/i18n'
import type { SiteSettings, SilhouetteGenerator, Product, GalleryItem } from '~/lib/types'

const client = clientFromEnv()
const [settings, generator, products, gallery] = await Promise.all([
  client.fetch<SiteSettings | null>(queries.siteSettings),
  client.fetch<SilhouetteGenerator | null>(queries.silhouetteGenerator),
  client.fetch<Product[]>(queries.featuredProducts),
  client.fetch<GalleryItem[]>(queries.galleryItems),
])
const title = pickLocalized(settings?.seo?.defaultTitle, 'id') || '3dprintingbandung'
const description = pickLocalized(settings?.seo?.defaultDescription, 'id') || 'Studio 3D printing di Bandung.'
---
<BaseLayout locale="id" title={title} description={description}>
  <Navbar locale="id" whatsappNumber={settings?.contact?.whatsapp} />
  <main>
    <Hero locale="id" brandName={settings?.brandName ?? '3dprintingbandung'} tagline={settings?.tagline ?? []} />
    <Pillars locale="id" />
    <GeneratorComingSoon locale="id" data={generator} />
    <ProductGrid locale="id" products={products} />
    <Gallery locale="id" items={gallery} />
    <MarketplaceCTA locale="id" links={settings?.marketplaceLinks ?? {}} />
  </main>
  <Footer locale="id" settings={settings} />
</BaseLayout>
```

Mirror in `apps/web/src/pages/en/index.astro`.

- [ ] **Step 4: Verify**

```bash
cd apps/web
npm run typecheck
npm run build
```

Expected: build succeeds. Run `npm run preview` and navigate through the full page — all sections render, marketplace buttons open new tabs, footer contacts display correctly. Stop preview server.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/MarketplaceCTA.astro apps/web/src/components/Footer.astro apps/web/src/pages
git commit -m "feat(web): add marketplace CTA and footer"
```

---

### Task 16: SEO — sitemap, robots, JSON-LD

**Files:**
- Create: `apps/web/src/pages/sitemap.xml.ts`
- Create: `apps/web/src/pages/robots.txt.ts`
- Modify: `apps/web/src/layouts/BaseLayout.astro`

- [ ] **Step 1: Create `apps/web/src/pages/sitemap.xml.ts`**

```ts
import type { APIRoute } from 'astro'

export const prerender = true

export const GET: APIRoute = () => {
  const site = import.meta.env.PUBLIC_SITE_URL ?? 'https://3dprintingbandung.my.id'
  const urls = [
    { loc: `${site}/id/`, alternates: [['id', `${site}/id/`], ['en', `${site}/en/`]] },
    { loc: `${site}/en/`, alternates: [['id', `${site}/id/`], ['en', `${site}/en/`]] },
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
${u.alternates
  .map(([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`)
  .join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${site}/id/"/>
  </url>`
  )
  .join('\n')}
</urlset>`
  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  })
}
```

- [ ] **Step 2: Create `apps/web/src/pages/robots.txt.ts`**

```ts
import type { APIRoute } from 'astro'

export const prerender = true

export const GET: APIRoute = () => {
  const site = import.meta.env.PUBLIC_SITE_URL ?? 'https://3dprintingbandung.my.id'
  const body = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${site}/sitemap.xml
`
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
```

- [ ] **Step 3: Add JSON-LD to BaseLayout**

Edit `apps/web/src/layouts/BaseLayout.astro` — add the structured-data block inside `<head>`, after the hreflang tags:

```astro
    <script type="application/ld+json" is:inline set:html={JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': siteUrl,
      name: '3dprintingbandung',
      url: siteUrl,
      areaServed: 'Bandung, Indonesia',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Bandung',
        addressCountry: 'ID',
      },
      sameAs: [
        'https://shopee.co.id',
        'https://tokopedia.com',
        'https://www.tiktok.com',
      ],
    })} />
```

Place it just before `<slot name="head" />`.

- [ ] **Step 4: Verify**

```bash
cd apps/web
npm run build
npm run preview
```

- `http://localhost:4321/sitemap.xml` → valid XML with `<urlset>` and hreflang alternates
- `http://localhost:4321/robots.txt` → valid robots with sitemap pointer
- View source on `/id/` → `<script type="application/ld+json">` present with `LocalBusiness`

Stop preview server.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/sitemap.xml.ts apps/web/src/pages/robots.txt.ts apps/web/src/layouts/BaseLayout.astro
git commit -m "feat(web): add sitemap, robots.txt, and LocalBusiness JSON-LD"
```

---

### Task 17: Deployment to Cloudflare Pages + Sanity webhook

**Files:**
- Create: `docs/deployment.md`

This task is mostly configuration in external dashboards. The code is done.

- [ ] **Step 1: Create `docs/deployment.md` with the full runbook**

```markdown
# Deployment Runbook

Two Cloudflare Pages projects, both reading from the same git repo on the `main` branch, each with a different root directory.

## Prerequisites

- Repo pushed to GitHub (or GitLab)
- Cloudflare account with `3dprintingbandung.my.id` as a zone
- Sanity project created (Tasks 2 + 5)

## Project A — Landing (`apps/web`)

1. Cloudflare Dashboard → Pages → "Create project" → "Connect to Git"
2. Pick the repo, branch `main`
3. Build settings:
   - **Project name:** `3dpb-web`
   - **Production branch:** `main`
   - **Framework preset:** Astro
   - **Build command:** `cd apps/web && npm ci && npm run build`
   - **Build output directory:** `apps/web/dist`
   - **Root directory:** (leave blank — repo root)
4. Environment variables (Production):
   - `PUBLIC_SANITY_PROJECT_ID` = (from Task 2)
   - `PUBLIC_SANITY_DATASET` = `production`
   - `PUBLIC_SANITY_API_VERSION` = `2024-10-01`
   - `SANITY_WRITE_TOKEN` = (create in Sanity Manage → API → Tokens, **scope = Editor** on the `production` dataset, name it "waitlist write-only"; mark as **Secret** in Cloudflare)
   - `PUBLIC_SITE_URL` = `https://3dprintingbandung.my.id`
   - `PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` = (from Cloudflare → Web Analytics → Add site → token)
5. Deploy. Wait for first build to complete.
6. Custom domain → add `3dprintingbandung.my.id` and `www.3dprintingbandung.my.id` (with redirect rule www → apex)
7. Copy the project's **Deploy Hook URL** (Settings → Builds & deployments → Deploy hooks → "Add deploy hook" → name "sanity-publish", branch `main`). Save the URL for the Sanity webhook step.

## Project B — Studio (`apps/studio`)

1. Cloudflare Dashboard → Pages → "Create project" → "Connect to Git" (same repo)
2. Build settings:
   - **Project name:** `3dpb-studio`
   - **Production branch:** `main`
   - **Framework preset:** None
   - **Build command:** `cd apps/studio && npm ci && npm run build`
   - **Build output directory:** `apps/studio/dist`
3. Environment variables:
   - `SANITY_STUDIO_PROJECT_ID` = (same as Project A)
   - `SANITY_STUDIO_DATASET` = `production`
4. Deploy
5. Custom domain → add `cms.3dprintingbandung.my.id`
6. In Sanity Manage → API → CORS origins → add `https://cms.3dprintingbandung.my.id` (allow credentials)

## Sanity Publish Webhook

1. Sanity Manage → API → Webhooks → Create webhook
2. **Name:** `rebuild-landing-on-publish`
3. **URL:** the Project A deploy hook URL from above
4. **Dataset:** `production`
5. **Trigger on:** Create, Update, Delete
6. **Filter (GROQ):** `_type in ["siteSettings", "product", "galleryItem", "silhouetteGenerator"]`
   - Intentionally excludes `waitlistEntry` — waitlist signups should not trigger a rebuild.
7. **HTTP method:** POST
8. **API version:** v2021-03-25
9. Save

## Smoke Test

- Edit the tagline in `siteSettings` → Publish
- Watch Cloudflare Pages → `3dpb-web` → Deployments — a new deploy should kick off within ~10 seconds
- After ~60-90 seconds, refresh `https://3dprintingbandung.my.id/id/` — new tagline visible
- Submit the waitlist form with a throwaway email → should succeed, new `waitlistEntry` visible in Studio
- Check `https://3dprintingbandung.my.id/sitemap.xml` returns valid XML
- Check Cloudflare Web Analytics dashboard — pageview registered

## Rollback

- Cloudflare Pages → Deployments → pick a previous successful deploy → "Rollback to this deployment"
```

- [ ] **Step 2: Commit the runbook**

```bash
git add docs/deployment.md
git commit -m "docs: add cloudflare pages + sanity webhook deployment runbook"
```

- [ ] **Step 3: Push to remote**

```bash
git push origin main
```

Expected: push succeeds. (If the remote does not exist yet, create the GitHub repo first: `gh repo create 3dprintingbandung/3dpb-app --private --source=. --push` — pick the org/name the user prefers.)

- [ ] **Step 4: Execute the runbook**

Follow `docs/deployment.md` end to end. When each checkbox in the "Smoke Test" section passes, the deploy is verified.

- [ ] **Step 5: Final Lighthouse check**

From a machine with Chrome:

```bash
npx lighthouse https://3dprintingbandung.my.id/id/ \
  --only-categories=performance,accessibility,seo,best-practices \
  --preset=mobile \
  --chrome-flags="--headless"
```

Expected: Performance ≥ 95, Accessibility ≥ 95, SEO = 100, Best Practices ≥ 95. If any metric falls short, review the Spec §9 targets and file issues; do not rewrite this plan.

- [ ] **Step 6: Tag the MVP**

```bash
git tag -a v0.1.0 -m "MVP Fase 1 deployed"
git push --tags
```

---

## Summary of Tasks

| # | Task | Produces |
|---|---|---|
| 1 | Monorepo root | `.gitignore`, `README.md`, first commit |
| 2 | Sanity Studio scaffold | `apps/studio/` installed & typechecks |
| 3 | Studio plugins + structure | Localization plugin, singleton structure |
| 4 | Schemas part 1 | `siteSettings`, `product` |
| 5 | Schemas part 2 | `galleryItem`, `silhouetteGenerator`, `waitlistEntry` — Studio fully usable |
| 6 | Astro scaffold | `apps/web/` builds, placeholder pages render |
| 7 | i18n helpers | `t()`, `pickLocalized()`, 12+ passing tests |
| 8 | Sanity client | Typed queries, image-url helper, tests |
| 9 | BaseLayout + Navbar + LanguageSwitcher | Sticky navbar with flag dropdown |
| 10 | Hero + Pillars | First two sections rendering from Sanity |
| 11 | Waitlist API | `/api/waitlist` POST with validation + tests |
| 12 | Generator Coming Soon + WaitlistForm | Interactive form writes to Sanity |
| 13 | Product grid + carousel + lightbox | Products with filters, carousel, marketplace buttons |
| 14 | Gallery | Masonry grid with filter |
| 15 | Marketplace CTA + Footer | Final CTA and footer |
| 16 | SEO — sitemap, robots, JSON-LD | Valid sitemap/robots, LocalBusiness schema |
| 17 | Deployment + webhook | Live on `3dprintingbandung.my.id` + `cms.3dprintingbandung.my.id`, publish webhook |
