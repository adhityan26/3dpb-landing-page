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
