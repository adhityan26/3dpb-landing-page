# Deployment Runbook

Two Cloudflare Pages projects, both reading from the same git repo on the `main` branch, each with a different root directory.

## Prerequisites

- Repo pushed to GitHub: `git@github.com:adhityan26/3dpb-landing-page.git`
- Cloudflare account with `3dprintingbandung.my.id` as a zone
- Sanity project `narxcnnu` created with dataset `production`

## Project A — Landing (`apps/web`)

1. Cloudflare Dashboard → Pages → "Create project" → "Connect to Git"
2. Pick the repo `adhityan26/3dpb-landing-page`, branch `main`
3. Build settings:
   - **Project name:** `3dpb-web`
   - **Framework preset:** Astro
   - **Build command:** `cd apps/web && npm ci && npm run build`
   - **Build output directory:** `apps/web/dist`
   - **Root directory:** (leave blank — repo root)
4. Environment variables (Production + Preview):
   - `PUBLIC_SANITY_PROJECT_ID` = `narxcnnu`
   - `PUBLIC_SANITY_DATASET` = `production`
   - `PUBLIC_SANITY_API_VERSION` = `2024-10-01`
   - `SANITY_WRITE_TOKEN` = _(create in Sanity Manage → API → Tokens → "Add API token", name: "waitlist-write", permissions: **Editor**, dataset: production. Copy the token and paste here. Mark as **Encrypt/Secret** in Cloudflare.)_
   - `PUBLIC_SITE_URL` = `https://3dprintingbandung.my.id`
   - `PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` = _(from Cloudflare → Web Analytics → Add site → copy token)_
5. Deploy. Wait for first build to complete.
6. Custom domain → add `3dprintingbandung.my.id` (and optionally `www.3dprintingbandung.my.id` with redirect to apex)
7. Copy the project's **Deploy Hook URL**: Settings → Builds & deployments → Deploy hooks → "Add deploy hook" → name `sanity-publish`, branch `main`. Save the URL.

## Project B — Studio (`apps/studio`)

1. Cloudflare Dashboard → Pages → "Create project" → "Connect to Git" (same repo)
2. Build settings:
   - **Project name:** `3dpb-studio`
   - **Framework preset:** None
   - **Build command:** `cd apps/studio && npm ci && npm run build`
   - **Build output directory:** `apps/studio/dist`
   - **Root directory:** (leave blank — repo root)
3. Environment variables:
   - `SANITY_STUDIO_PROJECT_ID` = `narxcnnu`
   - `SANITY_STUDIO_DATASET` = `production`
4. Deploy
5. Custom domain → add `cms.3dprintingbandung.my.id`
6. In Sanity Manage → API → CORS origins → add `https://cms.3dprintingbandung.my.id` (allow credentials)

## Sanity Publish Webhook

1. Sanity Manage → API → Webhooks → Create webhook
2. **Name:** `rebuild-landing-on-publish`
3. **URL:** the Project A deploy hook URL from step 7 above
4. **Dataset:** `production`
5. **Trigger on:** Create, Update, Delete
6. **Filter (GROQ):** `_type in ["siteSettings", "product", "galleryItem", "silhouetteGenerator"]`
   - Intentionally excludes `waitlistEntry` — waitlist signups should not trigger a rebuild.
7. **HTTP method:** POST
8. **API version:** v2021-03-25
9. Save

## Smoke Test

After both projects deploy and DNS propagates:

- [ ] `https://3dprintingbandung.my.id/` redirects to `/id/`
- [ ] `/id/` shows hero with tagline from Sanity
- [ ] `/en/` shows English translations
- [ ] Language switcher toggles between ID/EN
- [ ] WhatsApp button opens `wa.me` link
- [ ] Product grid shows featured products
- [ ] Product carousel/lightbox works
- [ ] Gallery renders with filter buttons
- [ ] Marketplace CTA buttons open correct links
- [ ] Footer shows contact info from Sanity
- [ ] `/sitemap.xml` returns valid XML with hreflang
- [ ] `/robots.txt` returns proper directives
- [ ] View source → JSON-LD `LocalBusiness` present
- [ ] Edit tagline in Studio → Publish → wait ~60s → refresh landing → new tagline appears
- [ ] Submit waitlist form with throwaway email → success message → check Studio → new `waitlistEntry` doc
- [ ] Cloudflare Web Analytics dashboard shows pageview
- [ ] `cms.3dprintingbandung.my.id` loads Sanity Studio correctly

## Rollback

Cloudflare Pages → Deployments → pick a previous successful deploy → "Rollback to this deployment"

## Local Development

```bash
# Landing page
cd apps/web && npm install && npm run dev
# → http://localhost:4321

# Sanity Studio
cd apps/studio && npm install && npm run dev
# → http://localhost:3333
```
