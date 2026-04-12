# Deploy to Docker (Proxmox LXC via Portainer)

Self-host runbook for `apps/web` (Astro SSR) + `apps/studio` (Sanity SPA behind nginx).
Images are built locally (or on a remote Docker daemon via `DOCKER_HOST`), pushed to
**GitHub Container Registry (GHCR)**, and deployed on the LXC at `192.168.88.113` as a
Portainer stack.

## Overview

| Service | Image | Port (host) | Runtime |
| --- | --- | --- | --- |
| `web` | `ghcr.io/adhityan26/3dpb-web:latest` | `4321` | Node 20 alpine (Astro SSR, slim ~290 MB) |
| `studio` | `ghcr.io/adhityan26/3dpb-studio:latest` | `3333` | nginx alpine (static SPA, ~100 MB) |

Sanity dataset stays on the Sanity cloud — we only self-host the Studio UI.

**Rendering mode:** the two index routes (`/id/`, `/en/`) have `export const prerender = false`,
so they're rendered on-demand per request and fetch live from Sanity's API CDN (~60 s cache).
Changes published in Studio show up on the landing after about a minute, **no rebuild needed**.
API routes (`/api/waitlist`) are also on-demand. Static routes (`/sitemap.xml`, `/robots.txt`,
`/`) stay prerendered at build time.

## One-time setup

### 1. GHCR token (local machine)

Create a GitHub PAT with `write:packages`, `read:packages`, `delete:packages`:
<https://github.com/settings/tokens/new?scopes=write:packages,read:packages,delete:packages>

```bash
echo "<PAT>" | docker login ghcr.io -u adhityan26 --password-stdin
```

### 2. Sanity write token

Sanity Manage → API → Tokens → **Add API token**
- Label: `waitlist-write`
- Permissions: **Editor** (not Administrator — least privilege)
- Copy the token — you'll paste it into the Portainer stack env.

### 3. Sanity CORS origins

Add every origin that loads the Studio, with **Allow credentials ON** (this checkbox is the
#1 gotcha — Studio login fails silently without it):

- `http://192.168.88.113:3333` (direct LXC access, for debugging)
- `https://cms.3dprintingbandung.my.id` (once Cloudflare tunnel / custom domain is live)

Set at <https://www.sanity.io/manage/project/narxcnnu/api>.

### 4. GHCR pull auth on the LXC

Images are private by default. The daemon on `192.168.88.113` needs to authenticate
to GHCR once:

```bash
ssh root@192.168.88.113
echo "<PAT>" | docker login ghcr.io -u adhityan26 --password-stdin
```

Or in Portainer: **Registries → Add registry → Custom → `ghcr.io`** with the PAT.

## Build & push

Two modes, pick one:

### Mode A — Build on a remote Docker daemon (current workflow)

The LXC exposes the Docker daemon on `tcp://192.168.88.113:2375`. From the dev Mac:

```bash
export DOCKER_HOST=tcp://192.168.88.113:2375
export DOCKER_BUILDKIT=1
```

All `docker` commands now target the remote daemon. Note: the bundled `docker compose`
subcommand is not available in the old local CLI — use the standalone `docker-compose`
v2 binary instead.

### Mode B — Build on the local Mac

Just skip the `DOCKER_HOST` export. Requires local Docker Desktop running.

### The actual build commands

From repo root:

```bash
docker build \
  --build-arg PUBLIC_SANITY_PROJECT_ID=narxcnnu \
  --build-arg PUBLIC_SANITY_DATASET=production \
  --build-arg PUBLIC_SANITY_API_VERSION=2024-10-01 \
  -t ghcr.io/adhityan26/3dpb-web:latest \
  apps/web

docker build \
  --build-arg SANITY_STUDIO_PROJECT_ID=narxcnnu \
  --build-arg SANITY_STUDIO_DATASET=production \
  -t ghcr.io/adhityan26/3dpb-studio:latest \
  apps/studio

docker push ghcr.io/adhityan26/3dpb-web:latest
docker push ghcr.io/adhityan26/3dpb-studio:latest
```

> **Build args are build-time only.** `PUBLIC_*` and `SANITY_STUDIO_*` get baked into
> the generated bundle. If you change project or dataset, rebuild. `SANITY_WRITE_TOKEN`
> is a **runtime** secret — never bake it in; pass it via the Portainer stack env below.

> **Only rebuild `apps/studio` when the Sanity schema changes.** Content edits (site
> settings, products, gallery, pillars, section copy) go live without any rebuild.

### Web image slimming — what to know if you edit dependencies

`apps/web/Dockerfile` uses a separate `prod-deps` stage that generates a **minimal
`package.json` from scratch**, listing only the packages that the compiled Astro server
bundle actually imports at runtime. It then deletes known-unused transitive build tools
(`typescript`, `vite`, `@babel`, `esbuild`, `@shikijs`, `lightningcss*`, `@img`, etc.)
to bring the image from ~586 MB down to ~290 MB.

If you add a new runtime dependency to `apps/web` (anything imported from `/api/` routes
or from code that runs in on-demand-rendered pages), **you must also add it to the
`prod-deps` stage in `apps/web/Dockerfile`** — otherwise the container will crash on
startup with `ERR_MODULE_NOT_FOUND`. Current runtime deps are:

- `@sanity/client` (GROQ queries, waitlist writes)
- `@sanity/image-url` (`urlFor()` helper)
- `astro` (server entry uses `astro/app/node`)
- `embla-carousel` + `embla-carousel-react` (ProductCard island)
- `react`, `react-dom` (React islands)
- `send`, `server-destroy` (peer deps of bundled `@astrojs/node` adapter)

Do **not** remove `rxjs` from the delete list without checking — it's a runtime dep of
`@sanity/client` and the server will 500 on any API route that uses Sanity without it.

## Deploy via Portainer stack

1. Portainer → **Stacks → Add stack**
2. Name: `3dpb`
3. Build method: **Web editor** → paste `docker-compose.yml` from repo root
4. **Environment variables** (bottom of the form):

   | Key | Value |
   | --- | --- |
   | `PUBLIC_SANITY_PROJECT_ID` | `narxcnnu` |
   | `PUBLIC_SANITY_DATASET` | `production` |
   | `PUBLIC_SANITY_API_VERSION` | `2024-10-01` |
   | `SANITY_WRITE_TOKEN` | `<token from one-time setup step 2>` |

5. **Deploy the stack**

Portainer pulls both images from GHCR and starts them.

## Verify

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://192.168.88.113:4321/id/
curl -s -o /dev/null -w "%{http_code}\n" http://192.168.88.113:4321/en/
curl -s -o /dev/null -w "%{http_code}\n" http://192.168.88.113:3333/
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST -H 'Content-Type: application/json' \
  -d '{"email":"invalid"}' \
  http://192.168.88.113:4321/api/waitlist
```

Expected: 200, 200, 200, 400.

- Landing: <http://192.168.88.113:4321/id/>
- Studio: <http://192.168.88.113:3333/>

Submitting the waitlist form with a real email should create a new `waitlistEntry` doc
in Sanity (visible in Studio → Waitlist Entries).

## Update / redeploy

```bash
# Rebuild & push a new :latest
docker build --build-arg PUBLIC_SANITY_PROJECT_ID=narxcnnu \
             --build-arg PUBLIC_SANITY_DATASET=production \
             --build-arg PUBLIC_SANITY_API_VERSION=2024-10-01 \
             -t ghcr.io/adhityan26/3dpb-web:latest apps/web
docker push ghcr.io/adhityan26/3dpb-web:latest
```

Then in Portainer → Stacks → `3dpb` → **Pull and redeploy**.

**Content-only changes (in Sanity Studio) don't need any of the above.** Just publish
and wait up to ~60 seconds for Sanity's CDN cache to flip over.

Tip: tag alongside `:latest` with a date (`:2026-04-11`) if you want easy rollback.

## Troubleshooting

- **`pull access denied`** on the LXC → `docker login ghcr.io` not done, or PAT lacks
  `read:packages`.
- **Landing returns 500 with `ERR_MODULE_NOT_FOUND`** → a runtime dep is missing from
  the `prod-deps` stage of `apps/web/Dockerfile`. Read the log for the package name,
  add it to the minimal `package.json` in that stage, rebuild.
- **Waitlist 500 `server_misconfigured`** → `SANITY_WRITE_TOKEN` missing from the
  stack env.
- **Waitlist 500 `write_failed`** → token lacks Editor permission on the dataset.
- **Studio shows blank page / login loop** → CORS origin missing, or **"Allow
  credentials"** is off on the CORS entry. Check Sanity Manage → API → CORS origins.
- **Studio works locally but not from a custom domain** → add the new origin to
  Sanity CORS (with Allow credentials ON).
- **Landing content looks stale after publishing in Studio** → wait ~60 s for
  Sanity's API CDN cache to expire. Hard-refresh (Cmd+Shift+R). If still stale, check
  that the routes have `export const prerender = false` — prerendered routes only
  update on rebuild.
- **Pictures in ProductCard don't look square** → check `ProductGrid.astro` uses
  `.width(800).height(800).fit('crop')` in the `urlFor()` chain, and that the button
  wrapping the `<img>` has `aspect-square`.
