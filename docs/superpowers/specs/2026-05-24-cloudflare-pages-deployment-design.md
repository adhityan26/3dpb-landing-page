# Cloudflare Pages Deployment — Design Spec

**Date:** 2026-05-24  
**Scope:** `apps/web` (Astro landing page)

## Goal

Move production deployment dari Docker/homelab ke Cloudflare Pages, sementara staging tetap di homelab via Docker. Satu codebase, dua target runtime.

## Architecture

```
main branch push
  ├── GitHub Actions (existing, trimmed)
  │     └── build-studio → GHCR (unchanged)
  │     └── build-web    → REMOVED
  │
  └── Cloudflare Pages Git Integration
        └── auto-build → CF edge network (PRODUCTION)

staging branch push
  └── GitHub Actions (baru: staging.yml)
        └── build-web Docker → GHCR (tag: staging)
              └── developer SSH ke homelab → docker pull + docker compose up -d (manual)
```

## Adapter Strategy

`astro.config.mjs` membaca env var `DEPLOY_TARGET`:

- `DEPLOY_TARGET=cloudflare` → pakai `@astrojs/cloudflare`
- default (tidak di-set) → pakai `@astrojs/node` (untuk Docker/homelab)

CF Pages dashboard set `DEPLOY_TARGET=cloudflare` sebagai env var. Docker build tidak set ini, jadi otomatis pakai node adapter.

## Files Changed

### `apps/web/astro.config.mjs`
- Tambah import `@astrojs/cloudflare`
- Switch adapter berdasarkan `DEPLOY_TARGET` env var

### `apps/web/package.json`
- Tambah `@astrojs/cloudflare` sebagai dependency

### `apps/web/wrangler.toml` (baru)
- Set `compatibility_flags = ["nodejs_compat"]` agar `@sanity/client` dan dependency Node.js-compatible lain bisa jalan di CF Workers runtime
- Set `pages_build_output_dir = "dist"`

### `.github/workflows/build-push.yml` (dimodifikasi)
- Hapus job `build-web` — CF Pages yang handle build production
- Trim `detect-changes` untuk hanya watch `apps/studio/**`

### `.github/workflows/staging.yml` (baru)
- Trigger: push ke branch `staging`, paths `apps/web/**`
- Build Docker image `apps/web` → push ke GHCR dengan tag `staging`
- Deploy ke homelab: manual (developer SSH + `docker pull` + `docker compose up -d`)

## CF Pages Dashboard Setup (manual, sekali)

1. Buka Cloudflare Pages → Create project → Connect to Git
2. Pilih repo → branch `main`
3. Settings:
   - **Root directory:** `apps/web`
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Environment variables:
   - `DEPLOY_TARGET` = `cloudflare`
   - `PUBLIC_SANITY_PROJECT_ID` = (dari CF dashboard)
   - `PUBLIC_SANITY_DATASET` = `production`
   - `PUBLIC_SANITY_API_VERSION` = `2024-10-01`
   - `SANITY_WRITE_TOKEN` = (secret, dari CF dashboard)
   - `PUBLIC_SITE_URL` = `https://3dprintingbandung.my.id`
   - `PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` = (dari CF dashboard)

## Staging / Homelab

Push ke branch `staging` → GitHub Actions build Docker image → push ke GHCR dengan tag `staging`.

Developer deploy ke homelab secara manual:
```bash
ssh homelab
docker pull ghcr.io/adhityan26/3dpb-web:staging
docker compose up -d
```

Docker build tidak set `DEPLOY_TARGET`, jadi otomatis pakai `@astrojs/node` adapter.

## Out of Scope

- Custom domain setup di CF Pages
- Auto-pull di homelab (watchtower)
- Sanity Studio deployment (tidak berubah)
