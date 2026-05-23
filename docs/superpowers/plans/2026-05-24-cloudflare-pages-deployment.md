# Cloudflare Pages Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy production landing page (`apps/web`) ke Cloudflare Pages via Git integration, dengan staging tetap di homelab via Docker.

**Architecture:** `astro.config.mjs` membaca env var `DEPLOY_TARGET` untuk switch adapter — `cloudflare` untuk CF Pages, `node` untuk Docker. CF Pages Git integration auto-build dari branch `main`. Branch `staging` trigger GitHub Actions yang build Docker image dan push ke GHCR untuk homelab.

**Tech Stack:** Astro 5, `@astrojs/cloudflare`, `@astrojs/node`, GitHub Actions, Cloudflare Pages, GHCR

---

## File Map

| File | Action | Tanggung jawab |
|------|--------|----------------|
| `apps/web/package.json` | Modify | Tambah `@astrojs/cloudflare` dependency |
| `apps/web/astro.config.mjs` | Modify | Switch adapter berdasarkan `DEPLOY_TARGET` |
| `apps/web/wrangler.toml` | Create | CF Pages config + `nodejs_compat` flag |
| `.github/workflows/build-push.yml` | Modify | Hapus `build-web` job, simplify ke studio-only |
| `.github/workflows/staging.yml` | Create | Build+push Docker web image dari branch `staging` |

---

### Task 1: Install `@astrojs/cloudflare` adapter

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install package**

```bash
cd apps/web
npm install @astrojs/cloudflare
```

Expected output: package added to `dependencies` in `package.json`.

- [ ] **Step 2: Verify package.json updated**

```bash
grep cloudflare apps/web/package.json
```

Expected: `"@astrojs/cloudflare": "^..."` muncul di dependencies.

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json
git commit -m "feat(web): add @astrojs/cloudflare adapter"
```

---

### Task 2: Update `astro.config.mjs` untuk dual-adapter

**Files:**
- Modify: `apps/web/astro.config.mjs`

- [ ] **Step 1: Update config**

Replace seluruh isi `apps/web/astro.config.mjs` dengan:

```js
import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import cloudflare from '@astrojs/cloudflare'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

const adapter =
  process.env.DEPLOY_TARGET === 'cloudflare'
    ? cloudflare()
    : node({ mode: 'standalone' })

export default defineConfig({
  site: 'https://3dprintingbandung.my.id',
  output: 'static',
  adapter,
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

- [ ] **Step 2: Verify build dengan node adapter (default)**

```bash
cd apps/web
npm run build
```

Expected: build sukses tanpa error. Directory `dist/` terbentuk dengan `dist/server/entry.mjs` (node SSR entry).

- [ ] **Step 3: Verify build dengan cloudflare adapter**

```bash
cd apps/web
DEPLOY_TARGET=cloudflare npm run build
```

Expected: build sukses. Directory `dist/` terbentuk dengan `dist/_worker.js` atau `dist/index.js` (CF Workers entry), bukan `dist/server/entry.mjs`.

- [ ] **Step 4: Clean up dist**

```bash
cd apps/web
rm -rf dist
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/astro.config.mjs
git commit -m "feat(web): switch adapter based on DEPLOY_TARGET env var"
```

---

### Task 3: Buat `wrangler.toml`

**Files:**
- Create: `apps/web/wrangler.toml`

- [ ] **Step 1: Buat file**

Buat `apps/web/wrangler.toml` dengan isi:

```toml
name = "3dpb-web"
compatibility_date = "2024-10-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "dist"
```

> `nodejs_compat` diperlukan agar `@sanity/client` dan package lain yang bergantung pada Node.js built-ins (`buffer`, `stream`, dll.) bisa jalan di CF Workers runtime.

- [ ] **Step 2: Verify file terbaca wrangler (jika wrangler CLI ada)**

```bash
cd apps/web
npx wrangler pages --version 2>/dev/null || echo "wrangler not installed locally — CF dashboard will use wrangler.toml automatically"
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/wrangler.toml
git commit -m "feat(web): add wrangler.toml for Cloudflare Pages config"
```

---

### Task 4: Trim `build-push.yml` — hapus job `build-web`

**Files:**
- Modify: `.github/workflows/build-push.yml`

- [ ] **Step 1: Replace workflow**

Replace seluruh isi `.github/workflows/build-push.yml` dengan:

```yaml
name: Build & push images

on:
  push:
    branches: [main]
    paths:
      - 'apps/studio/**'
      - '.github/workflows/build-push.yml'
  workflow_dispatch:

permissions:
  contents: read
  packages: write

env:
  REGISTRY: ghcr.io
  OWNER: adhityan26
  SANITY_PROJECT_ID: narxcnnu
  SANITY_DATASET: production
  SANITY_API_VERSION: '2024-10-01'

jobs:
  build-studio:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build & push studio image
        uses: docker/build-push-action@v5
        with:
          context: apps/studio
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.OWNER }}/3dpb-studio:latest
            ${{ env.REGISTRY }}/${{ env.OWNER }}/3dpb-studio:sha-${{ github.sha }}
          build-args: |
            SANITY_STUDIO_PROJECT_ID=${{ env.SANITY_PROJECT_ID }}
            SANITY_STUDIO_DATASET=${{ env.SANITY_DATASET }}
          cache-from: type=gha,scope=studio
          cache-to: type=gha,mode=max,scope=studio
```

> `detect-changes` job dihapus — dengan satu job saja, tidak perlu fan-out pattern. Trigger `paths` di workflow sudah cukup.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/build-push.yml
git commit -m "ci: remove build-web job — CF Pages handles production build"
```

---

### Task 5: Buat `staging.yml` workflow

**Files:**
- Create: `.github/workflows/staging.yml`

- [ ] **Step 1: Buat file**

Buat `.github/workflows/staging.yml` dengan isi:

```yaml
name: Build & push staging image

on:
  push:
    branches: [staging]
    paths:
      - 'apps/web/**'
      - '.github/workflows/staging.yml'
  workflow_dispatch:

permissions:
  contents: read
  packages: write

env:
  REGISTRY: ghcr.io
  OWNER: adhityan26
  SANITY_PROJECT_ID: narxcnnu
  SANITY_DATASET: production
  SANITY_API_VERSION: '2024-10-01'

jobs:
  build-web-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build & push web staging image
        uses: docker/build-push-action@v5
        with:
          context: apps/web
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.OWNER }}/3dpb-web:staging
          build-args: |
            PUBLIC_SANITY_PROJECT_ID=${{ env.SANITY_PROJECT_ID }}
            PUBLIC_SANITY_DATASET=${{ env.SANITY_DATASET }}
            PUBLIC_SANITY_API_VERSION=${{ env.SANITY_API_VERSION }}
          cache-from: type=gha,scope=web-staging
          cache-to: type=gha,mode=max,scope=web-staging
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/staging.yml
git commit -m "ci: add staging workflow — build Docker web image from staging branch"
```

---

### Task 6: Verifikasi end-to-end

- [ ] **Step 1: Push ke `main`, pastikan `build-push.yml` hanya run `build-studio`**

```bash
git push origin main
```

Buka GitHub Actions → workflow `Build & push images` → pastikan hanya job `build-studio` yang jalan, tidak ada `build-web`.

- [ ] **Step 2: Push ke `staging`, pastikan Docker web image ter-build**

```bash
git checkout -b staging 2>/dev/null || git checkout staging
git merge main
git push origin staging
```

Buka GitHub Actions → workflow `Build & push staging image` → pastikan job `build-web-staging` jalan dan image `ghcr.io/adhityan26/3dpb-web:staging` ter-push.

- [ ] **Step 3: Setup CF Pages (manual, sekali)**

Di Cloudflare dashboard:
1. Pages → Create project → Connect to Git
2. Pilih repo → branch `main`
3. Settings:
   - Root directory: `apps/web`
   - Framework preset: Astro
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Environment variables (set semua):
   - `DEPLOY_TARGET` = `cloudflare`
   - `PUBLIC_SANITY_PROJECT_ID` = `narxcnnu`
   - `PUBLIC_SANITY_DATASET` = `production`
   - `PUBLIC_SANITY_API_VERSION` = `2024-10-01`
   - `SANITY_WRITE_TOKEN` = (secret dari vault)
   - `PUBLIC_SITE_URL` = `https://3dprintingbandung.my.id`
   - `PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` = (dari CF dashboard)
5. Save & Deploy → tunggu build selesai
6. Buka preview URL → verifikasi landing page tampil dan API routes (`/api/waitlist`) merespons

- [ ] **Step 4: Deploy ke homelab dari staging image**

```bash
ssh homelab
docker pull ghcr.io/adhityan26/3dpb-web:staging
docker compose up -d
```

Buka URL staging → verifikasi landing page tampil.
