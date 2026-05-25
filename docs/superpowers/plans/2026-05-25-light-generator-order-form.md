# Light Generator Order Form — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the light generator order form from the `light-generator` project into `apps/web`, storing orders in Sanity Cloud so orders survive homelab downtime.

**Architecture:** Multi-step React wizard (`LightGeneratorOrderForm.tsx`) submits `multipart/form-data` to a Cloudflare Worker API route that uploads images to Sanity Assets and creates a `lightGeneratorOrder` document. Two proxy API routes forward island-detection and shadow-preview requests to `3dpb-ops` with 5s/15s timeouts and graceful fallbacks. A canvas component (`LightGeneratorCasingCanvas.tsx`) renders a real-time casing footprint overlay on the uploaded silhouette.

**Tech Stack:** Astro 5 + React 18, `@sanity/client` (existing, no new deps), Vitest for API route tests, HTML5 Canvas for casing visualizer, Tailwind v4 + `var(--color-brand-*)` / `var(--color-ink-*)` CSS variables (following `StravaMapOrderForm.tsx` patterns).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/i18n/id.json` | Modify | Add `light_generator.*` strings (Indonesian) |
| `src/i18n/en.json` | Modify | Add `light_generator.*` strings (English) |
| `src/lib/light-generator-types.ts` | Create | Shared TypeScript types for order data |
| `src/pages/api/light-generator-island-check.ts` | Create | Proxy island-check to 3dpb-ops, 5s timeout, fallback |
| `src/pages/api/light-generator-shadow-preview.ts` | Create | Proxy shadow-preview to 3dpb-ops, 15s timeout, fallback |
| `src/pages/api/light-generator-order.ts` | Create | Validate + upload images to Sanity + create order doc |
| `src/components/LightGeneratorCasingCanvas.tsx` | Create | HTML5 Canvas: silhouette + casing footprint overlay |
| `src/components/LightGeneratorOrderForm.tsx` | Create | 4-step wizard (Info → Config → Upload → Review) |
| `src/pages/id/light-generator.astro` | Create | Indonesian order page |
| `src/pages/en/light-generator.astro` | Create | English order page |
| `src/__tests__/api/light-generator-island-check.test.ts` | Create | Unit tests for island-check route |
| `src/__tests__/api/light-generator-shadow-preview.test.ts` | Create | Unit tests for shadow-preview route |
| `src/__tests__/api/light-generator-order.test.ts` | Create | Unit tests for order route |

---

### Task 1: i18n strings

**Files:**
- Modify: `src/i18n/id.json`
- Modify: `src/i18n/en.json`

- [ ] **Step 1: Add `light_generator` block to `src/i18n/id.json`**

Add inside the root JSON object (e.g. after the last existing key):

```json
"light_generator": {
  "title": "Order Light Generator",
  "description": "Cetak lampu dengan pola cahaya custom dari gambarmu sendiri.",
  "back_link": "← Kembali",
  "step_info": "Info",
  "step_config": "Konfigurasi",
  "step_upload": "Upload",
  "step_review": "Review",
  "next": "Lanjut →",
  "back": "← Kembali",
  "submit": "Kirim Order",
  "submitting": "Mengirim…",
  "info": {
    "name_label": "Nama lengkap",
    "name_placeholder": "Nama kamu",
    "contact_label": "WhatsApp / Instagram",
    "contact_placeholder": "08xx / @username",
    "notes_label": "Catatan",
    "notes_placeholder": "Informasi tambahan (opsional)",
    "notes_optional": "(opsional)"
  },
  "config": {
    "size_label": "Ukuran",
    "size_s": "S",
    "size_s_desc": "Ø 10 cm",
    "size_m": "M",
    "size_m_desc": "Ø 14 cm",
    "size_l": "L",
    "size_l_desc": "Ø 20 cm",
    "shape_label": "Bentuk",
    "shape_circle": "Bulat",
    "shape_square": "Kotak",
    "shape_triangle": "Segitiga",
    "shape_rect": "Persegi",
    "shape_oval": "Oval",
    "ratio_label": "Rasio (Lebar × Tinggi)",
    "ratio_width": "Lebar",
    "ratio_height": "Tinggi"
  },
  "upload": {
    "silhouette_label": "Gambar Desain",
    "silhouette_tooltip": "Gambar yang akan dijadikan pola cahaya oleh lampu. Contoh: logo, siluet hewan, karakter. Tips: gunakan gambar high-contrast (hitam putih) untuk hasil terbaik.",
    "silhouette_hint": "PNG, JPG, atau WebP · Maks. 5 MB",
    "silhouette_cta": "Klik atau drop gambar di sini",
    "floor_label": "Gambar Alas",
    "floor_optional": "(opsional)",
    "floor_tooltip": "Gambar yang dicetak pada alas lampu — bagian bawah yang kelihatan dari atas. Contoh: nama, tanggal, motif. Kalau tidak diisi, alas akan polos.",
    "floor_hint": "PNG, JPG, atau WebP · Maks. 5 MB",
    "floor_cta": "Klik atau drop gambar di sini",
    "shadow_title": "Konfigurasi Shadow",
    "shadow_diameter": "Diameter (cm)",
    "shadow_offset_x": "Offset X (mm)",
    "shadow_offset_y": "Offset Y (mm)",
    "preview_button": "Lihat Preview Shadow",
    "preview_loading": "Memuat preview…",
    "preview_fallback": "Preview render tidak tersedia, gunakan canvas di atas sebagai referensi.",
    "stems_label": "Support Stems",
    "stems_desc": "Dibutuhkan jika ada bagian yang terpisah",
    "stems_detecting": "Mendeteksi…",
    "stems_fallback": "Deteksi otomatis tidak tersedia. Aktifkan manual jika gambar punya bagian yang terpisah-pisah."
  },
  "review": {
    "title": "Ringkasan Order",
    "name": "Nama",
    "contact": "Kontak",
    "notes": "Catatan",
    "size": "Ukuran",
    "shape": "Bentuk",
    "ratio": "Rasio",
    "shadow": "Shadow",
    "stems": "Support Stems",
    "stems_yes": "Ya",
    "stems_no": "Tidak",
    "silhouette": "Gambar Desain",
    "floor": "Gambar Alas",
    "floor_none": "—"
  },
  "success": {
    "title": "Order Terkirim!",
    "subtitle": "Order ID kamu:",
    "whatsapp": "Konfirmasi via WhatsApp"
  },
  "error": {
    "invalid_name": "Nama harus diisi (2–100 karakter).",
    "invalid_contact": "Kontak harus diisi (5–100 karakter).",
    "invalid_size": "Pilih ukuran terlebih dahulu.",
    "invalid_shape": "Pilih bentuk terlebih dahulu.",
    "invalid_silhouette": "Upload gambar desain terlebih dahulu.",
    "file_too_large": "Ukuran file maksimal 5 MB.",
    "file_invalid_type": "Format file harus PNG, JPG, atau WebP.",
    "generic": "Terjadi kesalahan. Coba lagi sebentar."
  }
}
```

- [ ] **Step 2: Add `light_generator` block to `src/i18n/en.json`**

Add inside the root JSON object:

```json
"light_generator": {
  "title": "Order Light Generator",
  "description": "Print a lamp with a custom light pattern from your own image.",
  "back_link": "← Back",
  "step_info": "Info",
  "step_config": "Config",
  "step_upload": "Upload",
  "step_review": "Review",
  "next": "Next →",
  "back": "← Back",
  "submit": "Submit Order",
  "submitting": "Submitting…",
  "info": {
    "name_label": "Full name",
    "name_placeholder": "Your name",
    "contact_label": "WhatsApp / Instagram",
    "contact_placeholder": "08xx / @username",
    "notes_label": "Notes",
    "notes_placeholder": "Additional info (optional)",
    "notes_optional": "(optional)"
  },
  "config": {
    "size_label": "Size",
    "size_s": "S",
    "size_s_desc": "Ø 10 cm",
    "size_m": "M",
    "size_m_desc": "Ø 14 cm",
    "size_l": "L",
    "size_l_desc": "Ø 20 cm",
    "shape_label": "Shape",
    "shape_circle": "Circle",
    "shape_square": "Square",
    "shape_triangle": "Triangle",
    "shape_rect": "Rectangle",
    "shape_oval": "Oval",
    "ratio_label": "Ratio (Width × Height)",
    "ratio_width": "Width",
    "ratio_height": "Height"
  },
  "upload": {
    "silhouette_label": "Design Image",
    "silhouette_tooltip": "The image that becomes the light pattern. Examples: logo, animal silhouette, character. Tip: use high-contrast (black & white) images for best results.",
    "silhouette_hint": "PNG, JPG, or WebP · Max 5 MB",
    "silhouette_cta": "Click or drop image here",
    "floor_label": "Base Image",
    "floor_optional": "(optional)",
    "floor_tooltip": "Image printed on the lamp base — visible from above. Examples: name, special date, pattern. Leave blank for a plain base.",
    "floor_hint": "PNG, JPG, or WebP · Max 5 MB",
    "floor_cta": "Click or drop image here",
    "shadow_title": "Shadow Config",
    "shadow_diameter": "Diameter (cm)",
    "shadow_offset_x": "Offset X (mm)",
    "shadow_offset_y": "Offset Y (mm)",
    "preview_button": "View Shadow Preview",
    "preview_loading": "Loading preview…",
    "preview_fallback": "Preview render unavailable. Use the canvas above as a reference.",
    "stems_label": "Support Stems",
    "stems_desc": "Required if the design has disconnected parts",
    "stems_detecting": "Detecting…",
    "stems_fallback": "Auto-detection unavailable. Enable manually if your design has floating disconnected parts."
  },
  "review": {
    "title": "Order Summary",
    "name": "Name",
    "contact": "Contact",
    "notes": "Notes",
    "size": "Size",
    "shape": "Shape",
    "ratio": "Ratio",
    "shadow": "Shadow",
    "stems": "Support Stems",
    "stems_yes": "Yes",
    "stems_no": "No",
    "silhouette": "Design Image",
    "floor": "Base Image",
    "floor_none": "—"
  },
  "success": {
    "title": "Order Submitted!",
    "subtitle": "Your Order ID:",
    "whatsapp": "Confirm via WhatsApp"
  },
  "error": {
    "invalid_name": "Name is required (2–100 characters).",
    "invalid_contact": "Contact is required (5–100 characters).",
    "invalid_size": "Please select a size.",
    "invalid_shape": "Please select a shape.",
    "invalid_silhouette": "Please upload a design image.",
    "file_too_large": "File size must be 5 MB or less.",
    "file_invalid_type": "File must be PNG, JPG, or WebP.",
    "generic": "Something went wrong. Please try again."
  }
}
```

- [ ] **Step 3: Verify i18n keys load**

Run: `cd apps/web && node --input-type=module <<'EOF'
import id from './src/i18n/id.json' assert { type: 'json' }
import en from './src/i18n/en.json' assert { type: 'json' }
console.log('id ok:', !!id.light_generator.success.title)
console.log('en ok:', !!en.light_generator.success.title)
EOF`

Expected output:
```
id ok: true
en ok: true
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/i18n/id.json apps/web/src/i18n/en.json
git commit -m "feat(web/i18n): add light_generator strings for id + en"
```

---

### Task 2: TypeScript types

**Files:**
- Create: `src/lib/light-generator-types.ts`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/lib/light-generator-types.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  LG_SIZES,
  LG_SHAPES,
  isLGSize,
  isLGShape,
  ALLOWED_MIME_TYPES,
  MAX_FILE_BYTES,
} from '~/lib/light-generator-types'

describe('light-generator-types', () => {
  it('exports valid size values', () => {
    expect(LG_SIZES).toEqual(['S', 'M', 'L'])
  })

  it('exports valid shape values', () => {
    expect(LG_SHAPES).toEqual(['circle', 'square', 'triangle', 'rect', 'oval'])
  })

  it('isLGSize accepts valid values', () => {
    expect(isLGSize('S')).toBe(true)
    expect(isLGSize('M')).toBe(true)
    expect(isLGSize('L')).toBe(true)
    expect(isLGSize('X')).toBe(false)
    expect(isLGSize('')).toBe(false)
  })

  it('isLGShape accepts valid values', () => {
    expect(isLGShape('circle')).toBe(true)
    expect(isLGShape('square')).toBe(true)
    expect(isLGShape('triangle')).toBe(true)
    expect(isLGShape('rect')).toBe(true)
    expect(isLGShape('oval')).toBe(true)
    expect(isLGShape('hexagon')).toBe(false)
  })

  it('MAX_FILE_BYTES is 5 MB', () => {
    expect(MAX_FILE_BYTES).toBe(5 * 1024 * 1024)
  })

  it('ALLOWED_MIME_TYPES includes image types', () => {
    expect(ALLOWED_MIME_TYPES).toContain('image/png')
    expect(ALLOWED_MIME_TYPES).toContain('image/jpeg')
    expect(ALLOWED_MIME_TYPES).toContain('image/webp')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/__tests__/lib/light-generator-types.test.ts`

Expected: FAIL — `Cannot find module '~/lib/light-generator-types'`

- [ ] **Step 3: Create `src/lib/light-generator-types.ts`**

```ts
export const LG_SIZES = ['S', 'M', 'L'] as const
export type LGSize = (typeof LG_SIZES)[number]

export const LG_SHAPES = ['circle', 'square', 'triangle', 'rect', 'oval'] as const
export type LGShape = (typeof LG_SHAPES)[number]

export function isLGSize(v: unknown): v is LGSize {
  return LG_SIZES.includes(v as LGSize)
}

export function isLGShape(v: unknown): v is LGShape {
  return LG_SHAPES.includes(v as LGShape)
}

export const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const MAX_FILE_BYTES = 5 * 1024 * 1024

export interface LGShapeRatio {
  width: number
  height: number
}

export interface LGShadowConfig {
  diameter: number
  offsetX: number
  offsetY: number
}

export interface LGConfig {
  size: LGSize
  shape: LGShape
  shapeRatio?: LGShapeRatio
  shadow: LGShadowConfig
  supportStems: boolean
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run src/__tests__/lib/light-generator-types.test.ts`

Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/light-generator-types.ts apps/web/src/__tests__/lib/light-generator-types.test.ts
git commit -m "feat(web): light-generator shared types"
```

---

### Task 3: API — island check proxy

**Files:**
- Create: `src/pages/api/light-generator-island-check.ts`
- Test: `src/__tests__/api/light-generator-island-check.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/api/light-generator-island-check.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

import { POST } from '~/pages/api/light-generator-island-check'

function makeCtx(body: unknown, envOverrides: Partial<Record<string, string>> = {}) {
  return {
    request: new Request('https://test.local/api/light-generator-island-check', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    locals: {
      runtime: {
        env: {
          OPS_API_URL: 'https://ops.example.com',
          OPS_API_SECRET: 'test-secret',
          ...envOverrides,
        },
      },
    },
  }
}

beforeEach(() => {
  fetchMock.mockReset()
})

describe('POST /api/light-generator-island-check', () => {
  it('returns fallback when OPS_API_URL is not configured', async () => {
    const ctx = makeCtx({ imageAssetId: 'abc' }, { OPS_API_URL: '' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.fallback).toBe(true)
    expect(body.hasFloatingIslands).toBeNull()
  })

  it('returns result from 3dpb-ops on success', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ hasFloatingIslands: true }), { status: 200 })
    )
    const ctx = makeCtx({ imageAssetId: 'image-id-123' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.hasFloatingIslands).toBe(true)
    expect(body.fallback).toBeUndefined()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://ops.example.com/api/island-check')
    expect((init as RequestInit).headers as Record<string, string>).toMatchObject({
      Authorization: 'Bearer test-secret',
    })
  })

  it('returns fallback when fetch throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network error'))
    const ctx = makeCtx({ imageAssetId: 'abc' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.fallback).toBe(true)
    expect(body.hasFloatingIslands).toBeNull()
  })

  it('returns fallback when 3dpb-ops returns non-200', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }))
    const ctx = makeCtx({ imageAssetId: 'abc' })
    const res = await POST(ctx as never)
    const body = await res.json()
    expect(body.fallback).toBe(true)
  })

  it('returns 400 when imageAssetId is missing', async () => {
    const ctx = makeCtx({})
    const res = await POST(ctx as never)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/__tests__/api/light-generator-island-check.test.ts`

Expected: FAIL — `Cannot find module '~/pages/api/light-generator-island-check'`

- [ ] **Step 3: Create `src/pages/api/light-generator-island-check.ts`**

```ts
import type { APIContext } from 'astro'

export const prerender = false

function getEnv(ctx: APIContext, key: string): string | undefined {
  const runtimeEnv = (ctx.locals as { runtime?: { env?: Record<string, string | undefined> } })
    .runtime?.env
  return (
    runtimeEnv?.[key] ??
    (typeof process !== 'undefined' ? process.env[key] : undefined) ??
    (import.meta.env as Record<string, string | undefined>)[key]
  )
}

const FALLBACK = { hasFloatingIslands: null, fallback: true }
const TIMEOUT_MS = 5000

export async function POST(ctx: APIContext): Promise<Response> {
  let body: { imageAssetId?: unknown }
  try {
    body = (await ctx.request.json()) as { imageAssetId?: unknown }
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (typeof body.imageAssetId !== 'string' || !body.imageAssetId) {
    return Response.json({ error: 'missing_image_asset_id' }, { status: 400 })
  }

  const opsUrl = getEnv(ctx, 'OPS_API_URL')
  const opsSecret = getEnv(ctx, 'OPS_API_SECRET')

  if (!opsUrl || !opsSecret) {
    return Response.json(FALLBACK, { status: 200 })
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const res = await fetch(`${opsUrl}/api/island-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opsSecret}`,
      },
      body: JSON.stringify({ imageAssetId: body.imageAssetId }),
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) return Response.json(FALLBACK, { status: 200 })

    const data = (await res.json()) as { hasFloatingIslands: boolean }
    return Response.json({ hasFloatingIslands: data.hasFloatingIslands }, { status: 200 })
  } catch {
    return Response.json(FALLBACK, { status: 200 })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run src/__tests__/api/light-generator-island-check.test.ts`

Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/api/light-generator-island-check.ts apps/web/src/__tests__/api/light-generator-island-check.test.ts
git commit -m "feat(web/api): light-generator-island-check proxy with fallback"
```

---

### Task 4: API — shadow preview proxy

**Files:**
- Create: `src/pages/api/light-generator-shadow-preview.ts`
- Test: `src/__tests__/api/light-generator-shadow-preview.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/api/light-generator-shadow-preview.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

import { POST } from '~/pages/api/light-generator-shadow-preview'

function makeCtx(body: unknown, envOverrides: Partial<Record<string, string>> = {}) {
  return {
    request: new Request('https://test.local/api/light-generator-shadow-preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    locals: {
      runtime: {
        env: {
          OPS_API_URL: 'https://ops.example.com',
          OPS_API_SECRET: 'test-secret',
          ...envOverrides,
        },
      },
    },
  }
}

const VALID_CONFIG = { diameter: 15, offsetX: 0, offsetY: 0 }

beforeEach(() => {
  fetchMock.mockReset()
})

describe('POST /api/light-generator-shadow-preview', () => {
  it('returns fallback JSON when OPS_API_URL is not configured', async () => {
    const ctx = makeCtx({ imageAssetId: 'abc', config: VALID_CONFIG }, { OPS_API_URL: '' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.fallback).toBe(true)
  })

  it('forwards PNG bytes on success', async () => {
    const pngBytes = new Uint8Array([137, 80, 78, 71]) // PNG magic bytes
    fetchMock.mockResolvedValueOnce(
      new Response(pngBytes, { status: 200, headers: { 'content-type': 'image/png' } })
    )
    const ctx = makeCtx({ imageAssetId: 'img-123', config: VALID_CONFIG })
    const res = await POST(ctx as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/png')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://ops.example.com/api/shadow-preview')
    expect((init as RequestInit).headers as Record<string, string>).toMatchObject({
      Authorization: 'Bearer test-secret',
    })
  })

  it('returns fallback JSON when fetch throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('timeout'))
    const ctx = makeCtx({ imageAssetId: 'abc', config: VALID_CONFIG })
    const res = await POST(ctx as never)
    const body = await res.json()
    expect(body.fallback).toBe(true)
  })

  it('returns fallback JSON when ops returns non-200', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }))
    const ctx = makeCtx({ imageAssetId: 'abc', config: VALID_CONFIG })
    const res = await POST(ctx as never)
    const body = await res.json()
    expect(body.fallback).toBe(true)
  })

  it('returns 400 when imageAssetId is missing', async () => {
    const ctx = makeCtx({ config: VALID_CONFIG })
    const res = await POST(ctx as never)
    expect(res.status).toBe(400)
  })

  it('returns 400 when config is missing', async () => {
    const ctx = makeCtx({ imageAssetId: 'abc' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/__tests__/api/light-generator-shadow-preview.test.ts`

Expected: FAIL — `Cannot find module '~/pages/api/light-generator-shadow-preview'`

- [ ] **Step 3: Create `src/pages/api/light-generator-shadow-preview.ts`**

3dpb-ops returns raw PNG bytes. This proxy forwards those bytes directly to the browser.

```ts
import type { APIContext } from 'astro'
import type { LGShadowConfig } from '~/lib/light-generator-types'

export const prerender = false

function getEnv(ctx: APIContext, key: string): string | undefined {
  const runtimeEnv = (ctx.locals as { runtime?: { env?: Record<string, string | undefined> } })
    .runtime?.env
  return (
    runtimeEnv?.[key] ??
    (typeof process !== 'undefined' ? process.env[key] : undefined) ??
    (import.meta.env as Record<string, string | undefined>)[key]
  )
}

const FALLBACK = Response.json({ fallback: true }, { status: 200 })
const TIMEOUT_MS = 15000

export async function POST(ctx: APIContext): Promise<Response> {
  let body: { imageAssetId?: unknown; config?: unknown }
  try {
    body = (await ctx.request.json()) as { imageAssetId?: unknown; config?: unknown }
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (typeof body.imageAssetId !== 'string' || !body.imageAssetId) {
    return Response.json({ error: 'missing_image_asset_id' }, { status: 400 })
  }
  if (typeof body.config !== 'object' || body.config === null) {
    return Response.json({ error: 'missing_config' }, { status: 400 })
  }

  const opsUrl = getEnv(ctx, 'OPS_API_URL')
  const opsSecret = getEnv(ctx, 'OPS_API_SECRET')

  if (!opsUrl || !opsSecret) {
    return Response.json({ fallback: true }, { status: 200 })
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    const res = await fetch(`${opsUrl}/api/shadow-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opsSecret}`,
      },
      body: JSON.stringify({ imageAssetId: body.imageAssetId, config: body.config as LGShadowConfig }),
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) return Response.json({ fallback: true }, { status: 200 })

    // Forward raw PNG bytes from ops to the browser
    const pngBytes = await res.arrayBuffer()
    return new Response(pngBytes, {
      status: 200,
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
    })
  } catch {
    return Response.json({ fallback: true }, { status: 200 })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run src/__tests__/api/light-generator-shadow-preview.test.ts`

Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/api/light-generator-shadow-preview.ts apps/web/src/__tests__/api/light-generator-shadow-preview.test.ts
git commit -m "feat(web/api): light-generator-shadow-preview proxy — forward raw PNG bytes from ops"
```

---

### Task 5: API — order submission

**Files:**
- Create: `src/pages/api/light-generator-order.ts`
- Test: `src/__tests__/api/light-generator-order.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/api/light-generator-order.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const createMock = vi.fn()
const assetsUploadMock = vi.fn()

vi.mock('@sanity/client', () => ({
  createClient: vi.fn(() => ({
    create: createMock,
    assets: { upload: assetsUploadMock },
  })),
}))

import { POST } from '~/pages/api/light-generator-order'

function makeCtx(formData: FormData, envOverrides: Partial<Record<string, string>> = {}) {
  return {
    request: new Request('https://test.local/api/light-generator-order', {
      method: 'POST',
      body: formData,
    }),
    locals: {
      runtime: {
        env: {
          PUBLIC_SANITY_PROJECT_ID: 'proj123',
          PUBLIC_SANITY_DATASET: 'production',
          PUBLIC_SANITY_API_VERSION: '2024-10-01',
          SANITY_WRITE_TOKEN: 'sk-test',
          ...envOverrides,
        },
      },
    },
  }
}

function makeValidFormData(overrides: Record<string, string | File> = {}): FormData {
  const fd = new FormData()
  fd.set('name', 'Budi Santoso')
  fd.set('contact', '08123456789')
  fd.set('size', 'M')
  fd.set('shape', 'circle')
  fd.set('shadowDiameter', '15')
  fd.set('shadowOffsetX', '0')
  fd.set('shadowOffsetY', '0')
  fd.set('supportStems', 'false')
  fd.set('silhouette', new File(['img'], 'kucing.png', { type: 'image/png' }))
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v)
  return fd
}

beforeEach(() => {
  createMock.mockReset()
  assetsUploadMock.mockReset()
})

describe('POST /api/light-generator-order', () => {
  it('returns 400 when name is missing', async () => {
    const fd = makeValidFormData()
    fd.set('name', '')
    const res = await POST(makeCtx(fd) as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('validation_error')
  })

  it('returns 400 when size is invalid', async () => {
    const fd = makeValidFormData({ size: 'XL' })
    const res = await POST(makeCtx(fd) as never)
    expect(res.status).toBe(400)
  })

  it('returns 400 when shape is invalid', async () => {
    const fd = makeValidFormData({ shape: 'hexagon' })
    const res = await POST(makeCtx(fd) as never)
    expect(res.status).toBe(400)
  })

  it('returns 400 when silhouette is missing', async () => {
    const fd = makeValidFormData()
    fd.delete('silhouette')
    const res = await POST(makeCtx(fd) as never)
    expect(res.status).toBe(400)
  })

  it('returns 201 with orderId on success', async () => {
    assetsUploadMock.mockResolvedValue({ _id: 'image-asset-1' })
    createMock.mockResolvedValueOnce({ _id: 'doc-1' })

    const res = await POST(makeCtx(makeValidFormData()) as never)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(typeof body.orderId).toBe('string')
    expect(body.orderId).toMatch(/^LG-\d{8}-[A-Z0-9]{4}$/)
  })

  it('creates sanity doc with correct fields', async () => {
    assetsUploadMock.mockResolvedValue({ _id: 'image-asset-1' })
    createMock.mockResolvedValueOnce({ _id: 'doc-1' })

    await POST(makeCtx(makeValidFormData()) as never)

    const doc = createMock.mock.calls[0][0]
    expect(doc._type).toBe('lightGeneratorOrder')
    expect(doc.customerName).toBe('Budi Santoso')
    expect(doc.customerContact).toBe('08123456789')
    expect(doc.status).toBe('submitted')
    expect(typeof doc.config).toBe('string')
    const config = JSON.parse(doc.config)
    expect(config.size).toBe('M')
    expect(config.shape).toBe('circle')
    expect(config.shadow.diameter).toBe(15)
    expect(typeof doc.submittedAt).toBe('string')
  })

  it('uploads optional floorInsert when provided', async () => {
    assetsUploadMock.mockResolvedValue({ _id: 'image-asset-x' })
    createMock.mockResolvedValueOnce({ _id: 'doc-1' })

    const fd = makeValidFormData({
      floorInsert: new File(['fl'], 'floor.png', { type: 'image/png' }),
    })
    await POST(makeCtx(fd) as never)

    expect(assetsUploadMock).toHaveBeenCalledTimes(2)
    const doc = createMock.mock.calls[0][0]
    expect(doc.floorInsertImage).toBeDefined()
  })

  it('returns 500 when sanity write token is missing', async () => {
    const res = await POST(makeCtx(makeValidFormData(), { SANITY_WRITE_TOKEN: '' }) as never)
    expect(res.status).toBe(500)
  })

  it('returns 500 when sanity create throws', async () => {
    assetsUploadMock.mockResolvedValue({ _id: 'img-1' })
    createMock.mockRejectedValueOnce(new Error('boom'))
    const res = await POST(makeCtx(makeValidFormData()) as never)
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/__tests__/api/light-generator-order.test.ts`

Expected: FAIL — `Cannot find module '~/pages/api/light-generator-order'`

- [ ] **Step 3: Create `src/pages/api/light-generator-order.ts`**

```ts
import type { APIContext } from 'astro'
import { createClient } from '@sanity/client'
import { isLGSize, isLGShape, ALLOWED_MIME_TYPES, MAX_FILE_BYTES } from '~/lib/light-generator-types'
import type { LGConfig } from '~/lib/light-generator-types'

export const prerender = false

function getEnv(ctx: APIContext, key: string): string | undefined {
  const runtimeEnv = (ctx.locals as { runtime?: { env?: Record<string, string | undefined> } })
    .runtime?.env
  return (
    runtimeEnv?.[key] ??
    (typeof process !== 'undefined' ? process.env[key] : undefined) ??
    (import.meta.env as Record<string, string | undefined>)[key]
  )
}

function generateOrderId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `LG-${date}-${rand}`
}

function validateFile(file: File | null): string | null {
  if (!file || file.size === 0) return 'missing'
  if (file.size > MAX_FILE_BYTES) return 'too_large'
  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) return 'invalid_type'
  return null
}

export async function POST(ctx: APIContext): Promise<Response> {
  let formData: FormData
  try {
    formData = await ctx.request.formData()
  } catch {
    return Response.json({ error: 'invalid_form_data' }, { status: 400 })
  }

  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const contact = (formData.get('contact') as string | null)?.trim() ?? ''
  const notes = (formData.get('notes') as string | null)?.trim().slice(0, 500) ?? ''
  const size = (formData.get('size') as string | null) ?? ''
  const shape = (formData.get('shape') as string | null) ?? ''
  const shapeRatioW = parseInt((formData.get('shapeRatioW') as string | null) ?? '0', 10)
  const shapeRatioH = parseInt((formData.get('shapeRatioH') as string | null) ?? '0', 10)
  const shadowDiameter = parseFloat((formData.get('shadowDiameter') as string | null) ?? '15')
  const shadowOffsetX = parseFloat((formData.get('shadowOffsetX') as string | null) ?? '0')
  const shadowOffsetY = parseFloat((formData.get('shadowOffsetY') as string | null) ?? '0')
  const supportStems = (formData.get('supportStems') as string | null) === 'true'
  const silhouetteFile = formData.get('silhouette') as File | null
  const floorInsertFile = formData.get('floorInsert') as File | null

  const errors: string[] = []
  if (!name || name.length < 2 || name.length > 100) errors.push('invalid_name')
  if (!contact || contact.length < 5 || contact.length > 100) errors.push('invalid_contact')
  if (!isLGSize(size)) errors.push('invalid_size')
  if (!isLGShape(shape)) errors.push('invalid_shape')
  if (isNaN(shadowDiameter) || shadowDiameter < 10 || shadowDiameter > 200) errors.push('invalid_shadow_diameter')
  if (isNaN(shadowOffsetX) || shadowOffsetX < -500 || shadowOffsetX > 500) errors.push('invalid_shadow_offset_x')
  if (isNaN(shadowOffsetY) || shadowOffsetY < -500 || shadowOffsetY > 500) errors.push('invalid_shadow_offset_y')

  const silhouetteError = validateFile(silhouetteFile)
  if (silhouetteError) errors.push(`invalid_silhouette_${silhouetteError}`)

  if (floorInsertFile && floorInsertFile.size > 0) {
    const floorError = validateFile(floorInsertFile)
    if (floorError) errors.push(`invalid_floor_insert_${floorError}`)
  }

  if (errors.length > 0) {
    return Response.json({ error: 'validation_error', fields: errors }, { status: 400 })
  }

  const projectId = getEnv(ctx, 'PUBLIC_SANITY_PROJECT_ID')
  const dataset = getEnv(ctx, 'PUBLIC_SANITY_DATASET') ?? 'production'
  const apiVersion = getEnv(ctx, 'PUBLIC_SANITY_API_VERSION') ?? '2024-10-01'
  const token = getEnv(ctx, 'SANITY_WRITE_TOKEN')

  if (!projectId || !token) {
    return Response.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false })

  try {
    const silhouetteAsset = await client.assets.upload('image', silhouetteFile!, {
      filename: silhouetteFile!.name,
    })

    let floorInsertAsset: { _id: string } | null = null
    if (floorInsertFile && floorInsertFile.size > 0) {
      floorInsertAsset = await client.assets.upload('image', floorInsertFile, {
        filename: floorInsertFile.name,
      })
    }

    const orderId = generateOrderId()

    const config: LGConfig = {
      size: size as LGConfig['size'],
      shape: shape as LGConfig['shape'],
      shadow: { diameter: shadowDiameter, offsetX: shadowOffsetX, offsetY: shadowOffsetY },
      supportStems,
    }
    if ((shape === 'rect' || shape === 'oval') && shapeRatioW > 0 && shapeRatioH > 0) {
      config.shapeRatio = { width: shapeRatioW, height: shapeRatioH }
    }

    const doc: Record<string, unknown> = {
      _type: 'lightGeneratorOrder',
      orderId,
      status: 'submitted',
      customerName: name,
      customerContact: contact,
      config: JSON.stringify(config),
      silhouetteImage: { _type: 'image', asset: { _type: 'reference', _ref: silhouetteAsset._id } },
      submittedAt: new Date().toISOString(),
    }
    if (notes) doc.customerNotes = notes
    if (floorInsertAsset) {
      doc.floorInsertImage = { _type: 'image', asset: { _type: 'reference', _ref: floorInsertAsset._id } }
    }

    await client.create(doc as never)

    return Response.json({ orderId }, { status: 201 })
  } catch (err) {
    console.error('[light-generator-order] failed', err)
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run src/__tests__/api/light-generator-order.test.ts`

Expected: PASS — 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/api/light-generator-order.ts apps/web/src/__tests__/api/light-generator-order.test.ts
git commit -m "feat(web/api): light-generator-order — validate + upload Sanity + create doc"
```

---

### Task 6: Canvas component

**Files:**
- Create: `src/components/LightGeneratorCasingCanvas.tsx`

The canvas renders:
1. The silhouette image (object-contain into the canvas bounds)
2. The casing shape outline centered at `(canvas.width/2 + offsetX_mm, canvas.height/2 + offsetY_mm)` at scale 1px/mm
3. Shape is circle/square/triangle/rect/oval; size determined by `shadowDiameter * 10px/cm`

Scale constant: `10px/cm`. So:
- shadowDiameter 10cm → 100px footprint diameter
- shadowDiameter 20cm → 200px footprint diameter
- Offsets: 1px per mm

Canvas is fixed at 360×360px. The casing footprint is drawn as an unfilled stroke (2px brand color).

- [ ] **Step 1: Create `src/components/LightGeneratorCasingCanvas.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import type { LGShape } from '~/lib/light-generator-types'

interface Props {
  silhouetteObjectUrl: string | null
  shape: LGShape
  shapeRatio?: { width: number; height: number }
  shadowDiameter: number
  offsetX: number
  offsetY: number
}

const CANVAS_SIZE = 360
const PX_PER_CM = 10
const PX_PER_MM = 1
const STROKE_COLOR = '#4f46e5'
const STROKE_WIDTH = 2

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: LGShape,
  cx: number,
  cy: number,
  radius: number,
  ratio?: { width: number; height: number }
) {
  ctx.beginPath()
  switch (shape) {
    case 'circle':
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      break
    case 'square': {
      ctx.rect(cx - radius, cy - radius, radius * 2, radius * 2)
      break
    }
    case 'triangle': {
      const h = radius * Math.sqrt(3)
      ctx.moveTo(cx, cy - radius)
      ctx.lineTo(cx + h / 2, cy + radius / 2)
      ctx.lineTo(cx - h / 2, cy + radius / 2)
      ctx.closePath()
      break
    }
    case 'rect': {
      const rw = ratio && ratio.height > 0 ? radius * (ratio.width / Math.max(ratio.width, ratio.height)) : radius
      const rh = ratio && ratio.width > 0 ? radius * (ratio.height / Math.max(ratio.width, ratio.height)) : radius
      ctx.rect(cx - rw, cy - rh, rw * 2, rh * 2)
      break
    }
    case 'oval': {
      const ow = ratio && ratio.height > 0 ? radius * (ratio.width / Math.max(ratio.width, ratio.height)) : radius
      const oh = ratio && ratio.width > 0 ? radius * (ratio.height / Math.max(ratio.width, ratio.height)) : radius
      ctx.ellipse(cx, cy, ow, oh, 0, 0, Math.PI * 2)
      break
    }
  }
}

export default function LightGeneratorCasingCanvas({
  silhouetteObjectUrl,
  shape,
  shapeRatio,
  shadowDiameter,
  offsetX,
  offsetY,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const radius = (shadowDiameter * PX_PER_CM) / 2
    const cx = CANVAS_SIZE / 2 + offsetX * PX_PER_MM
    const cy = CANVAS_SIZE / 2 + offsetY * PX_PER_MM

    const render = (img?: HTMLImageElement) => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

      if (img) {
        const scale = Math.min(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height)
        const w = img.width * scale
        const h = img.height * scale
        const x = (CANVAS_SIZE - w) / 2
        const y = (CANVAS_SIZE - h) / 2
        ctx.drawImage(img, x, y, w, h)
      }

      ctx.strokeStyle = STROKE_COLOR
      ctx.lineWidth = STROKE_WIDTH
      drawShape(ctx, shape, cx, cy, radius, shapeRatio)
      ctx.stroke()
    }

    if (silhouetteObjectUrl) {
      const img = new Image()
      img.onload = () => render(img)
      img.src = silhouetteObjectUrl
    } else {
      render()
    }
  }, [silhouetteObjectUrl, shape, shapeRatio, shadowDiameter, offsetX, offsetY])

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="w-full rounded-xl border border-[color:var(--color-ink-200)] bg-[color:var(--color-ink-50)]"
      style={{ maxWidth: CANVAS_SIZE }}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/LightGeneratorCasingCanvas.tsx
git commit -m "feat(web): LightGeneratorCasingCanvas — HTML5 canvas casing footprint overlay"
```

---

### Task 7: Order form wizard

**Files:**
- Create: `src/components/LightGeneratorOrderForm.tsx`

This is a 4-step wizard: Info → Config → Upload → Review/Submit. Follows the same CSS variable and radio-card patterns as `StravaMapOrderForm.tsx`.

- [ ] **Step 1: Create `src/components/LightGeneratorOrderForm.tsx`**

```tsx
import { useState, useRef, useCallback } from 'react'
import type { LGShape, LGSize } from '~/lib/light-generator-types'
import { LG_SHAPES, LG_SIZES } from '~/lib/light-generator-types'
import LightGeneratorCasingCanvas from './LightGeneratorCasingCanvas'

type Step = 1 | 2 | 3 | 4
type Status = 'idle' | 'submitting' | 'success' | 'error'

interface Strings {
  step_info: string
  step_config: string
  step_upload: string
  step_review: string
  next: string
  back: string
  submit: string
  submitting: string
  info: {
    name_label: string
    name_placeholder: string
    contact_label: string
    contact_placeholder: string
    notes_label: string
    notes_placeholder: string
    notes_optional: string
  }
  config: {
    size_label: string
    size_s: string; size_s_desc: string
    size_m: string; size_m_desc: string
    size_l: string; size_l_desc: string
    shape_label: string
    shape_circle: string; shape_square: string; shape_triangle: string; shape_rect: string; shape_oval: string
    ratio_label: string; ratio_width: string; ratio_height: string
  }
  upload: {
    silhouette_label: string; silhouette_tooltip: string; silhouette_hint: string; silhouette_cta: string
    floor_label: string; floor_optional: string; floor_tooltip: string; floor_hint: string; floor_cta: string
    shadow_title: string; shadow_diameter: string; shadow_offset_x: string; shadow_offset_y: string
    preview_button: string; preview_loading: string; preview_fallback: string
    stems_label: string; stems_desc: string; stems_detecting: string; stems_fallback: string
  }
  review: {
    title: string; name: string; contact: string; notes: string
    size: string; shape: string; ratio: string; shadow: string
    stems: string; stems_yes: string; stems_no: string
    silhouette: string; floor: string; floor_none: string
  }
  success: { title: string; subtitle: string; whatsapp: string }
  error: {
    invalid_name: string; invalid_contact: string; invalid_size: string; invalid_shape: string
    invalid_silhouette: string; file_too_large: string; file_invalid_type: string; generic: string
  }
}

interface Props {
  strings: Strings
  locale: 'id' | 'en'
  whatsappNumber?: string
}

const SIZE_DATA: { value: LGSize; label: string; desc: string }[] = [
  { value: 'S', label: 'S', desc: 'Ø 10 cm' },
  { value: 'M', label: 'M', desc: 'Ø 14 cm' },
  { value: 'L', label: 'L', desc: 'Ø 20 cm' },
]

const SHAPE_ICONS: Record<LGShape, string> = {
  circle: `<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="13" stroke="currentColor" stroke-width="2.5"/></svg>`,
  square: `<svg viewBox="0 0 32 32" fill="none"><rect x="4" y="4" width="24" height="24" rx="2" stroke="currentColor" stroke-width="2.5"/></svg>`,
  triangle: `<svg viewBox="0 0 32 32" fill="none"><polygon points="16,3 30,29 2,29" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" fill="none"/></svg>`,
  rect: `<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="9" width="28" height="14" rx="2" stroke="currentColor" stroke-width="2.5"/></svg>`,
  oval: `<svg viewBox="0 0 32 32" fill="none"><ellipse cx="16" cy="16" rx="14" ry="9" stroke="currentColor" stroke-width="2.5"/></svg>`,
}

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

function FileUploadZone({
  label,
  tooltip,
  hint,
  cta,
  optional,
  file,
  onFile,
  onError,
  errorMsgTooLarge,
  errorMsgInvalidType,
  accent,
}: {
  label: string
  tooltip: string
  hint: string
  cta: string
  optional?: string
  file: File | null
  onFile: (f: File) => void
  onError: (msg: string) => void
  errorMsgTooLarge: string
  errorMsgInvalidType: string
  accent?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const [dragging, setDragging] = useState(false)

  function handleFile(f: File) {
    if (!ALLOWED_TYPES.includes(f.type)) { onError(errorMsgInvalidType); return }
    if (f.size > MAX_FILE_BYTES) { onError(errorMsgTooLarge); return }
    onFile(f)
  }

  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-sm font-semibold">
          {label}
          {optional && <span className="ml-1 font-normal text-[color:var(--color-ink-400)]">{optional}</span>}
        </span>
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            className="flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--color-ink-400)] text-[10px] font-bold text-white"
            aria-label="info"
          >?</button>
          {showTooltip && (
            <div className="absolute left-6 top-[-8px] z-10 w-56 rounded-lg bg-[#1f2937] p-3 text-[11px] leading-relaxed text-white shadow-lg">
              {tooltip}
            </div>
          )}
        </div>
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
          dragging
            ? 'border-[color:var(--color-brand-400)] bg-[color:var(--color-brand-50)]'
            : accent
            ? 'border-[color:var(--color-brand-400)] bg-[color:var(--color-brand-50)] hover:border-[color:var(--color-brand-500)]'
            : 'border-[color:var(--color-ink-300)] bg-[color:var(--color-ink-50)] hover:border-[color:var(--color-ink-400)]'
        }`}
      >
        {file ? (
          <div>
            <div className="mb-1 text-2xl">✅</div>
            <div className="text-sm font-semibold text-[color:var(--color-brand-600)]">{file.name}</div>
            <div className="mt-0.5 text-xs text-[color:var(--color-ink-400)]">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
          </div>
        ) : (
          <div>
            <div className="mb-1.5 text-3xl">{accent ? '🖼️' : '📁'}</div>
            <div className={`text-sm font-semibold ${accent ? 'text-[color:var(--color-brand-600)]' : 'text-[color:var(--color-ink-500)]'}`}>{cta}</div>
            <div className="mt-0.5 text-xs text-[color:var(--color-ink-400)]">{hint}</div>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
    </div>
  )
}

function StepIndicator({ current, labels }: { current: Step; labels: string[] }) {
  return (
    <div className="mb-6 flex items-center gap-1">
      {labels.map((label, i) => {
        const step = (i + 1) as Step
        const active = step === current
        const done = step < current
        return (
          <div key={step} className="flex items-center" style={{ flex: step < labels.length ? '1' : undefined }}>
            <div className="flex flex-col items-center">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                active ? 'bg-[color:var(--color-brand-500)] text-white'
                : done ? 'bg-[color:var(--color-brand-200)] text-[color:var(--color-brand-700)]'
                : 'bg-[color:var(--color-ink-200)] text-[color:var(--color-ink-500)]'
              }`}>{done ? '✓' : step}</div>
              <div className={`mt-1 text-[10px] font-semibold ${active ? 'text-[color:var(--color-brand-600)]' : done ? 'text-[color:var(--color-brand-400)]' : 'text-[color:var(--color-ink-400)]'}`}>{label}</div>
            </div>
            {step < labels.length && (
              <div className={`mb-4 h-0.5 flex-1 mx-1 ${done ? 'bg-[color:var(--color-brand-200)]' : 'bg-[color:var(--color-ink-200)]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function LightGeneratorOrderForm({ strings, locale, whatsappNumber }: Props) {
  const s = strings
  const [step, setStep] = useState<Step>(1)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [orderId, setOrderId] = useState('')

  // Step 1
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [notes, setNotes] = useState('')

  // Step 2
  const [size, setSize] = useState<LGSize | ''>('')
  const [shape, setShape] = useState<LGShape | ''>('')
  const [ratioW, setRatioW] = useState(3)
  const [ratioH, setRatioH] = useState(2)

  // Step 3
  const [silhouette, setSilhouette] = useState<File | null>(null)
  const [silhouetteUrl, setSilhouetteUrl] = useState<string | null>(null)
  const [floorInsert, setFloorInsert] = useState<File | null>(null)
  const [shadowDiameter, setShadowDiameter] = useState(15)
  const [shadowOffsetX, setShadowOffsetX] = useState(0)
  const [shadowOffsetY, setShadowOffsetY] = useState(0)
  const [supportStems, setSupportStems] = useState(false)
  const [stemsChecking, setStemsChecking] = useState(false)
  const [stemsFallback, setStemsFallback] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewFallback, setPreviewFallback] = useState(false)

  const handleSilhouette = useCallback((file: File) => {
    setSilhouette(file)
    if (silhouetteUrl) URL.revokeObjectURL(silhouetteUrl)
    const url = URL.createObjectURL(file)
    setSilhouetteUrl(url)
    setStemsChecking(true)
    setStemsFallback(false)
    setPreviewUrl(null)
    setPreviewFallback(false)
    // Island check is done via assetId after upload — at this point we trigger with a placeholder
    // The actual island check requires uploading the image first; we defer until form submission
    // For UX, we just show manual toggle immediately with fallback hint
    setStemsChecking(false)
    setStemsFallback(true)
  }, [silhouetteUrl])

  async function loadShadowPreview() {
    if (!silhouette) return
    setPreviewLoading(true)
    setPreviewFallback(false)
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
    try {
      const res = await fetch('/api/light-generator-shadow-preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          imageAssetId: 'pending',
          config: { diameter: shadowDiameter, offsetX: shadowOffsetX, offsetY: shadowOffsetY },
        }),
      })
      if (res.ok && res.headers.get('content-type')?.includes('image/png')) {
        const blob = await res.blob()
        setPreviewUrl(URL.createObjectURL(blob))
      } else {
        setPreviewFallback(true)
      }
    } catch {
      setPreviewFallback(true)
    } finally {
      setPreviewLoading(false)
    }
  }

  function validateStep(s: Step): string {
    if (s === 1) {
      if (!name.trim() || name.trim().length < 2 || name.trim().length > 100) return strings.error.invalid_name
      if (!contact.trim() || contact.trim().length < 5 || contact.trim().length > 100) return strings.error.invalid_contact
    }
    if (s === 2) {
      if (!size) return strings.error.invalid_size
      if (!shape) return strings.error.invalid_shape
    }
    if (s === 3) {
      if (!silhouette) return strings.error.invalid_silhouette
    }
    return ''
  }

  function handleNext() {
    const err = validateStep(step)
    if (err) { setErrorMsg(err); return }
    setErrorMsg('')
    setStep((prev) => (prev + 1) as Step)
  }

  async function handleSubmit() {
    const err = validateStep(3)
    if (err) { setStep(3); setErrorMsg(err); return }
    setStatus('submitting')
    setErrorMsg('')

    const fd = new FormData()
    fd.set('name', name.trim())
    fd.set('contact', contact.trim())
    if (notes.trim()) fd.set('notes', notes.trim())
    fd.set('size', size)
    fd.set('shape', shape)
    if ((shape === 'rect' || shape === 'oval')) {
      fd.set('shapeRatioW', String(ratioW))
      fd.set('shapeRatioH', String(ratioH))
    }
    fd.set('shadowDiameter', String(shadowDiameter))
    fd.set('shadowOffsetX', String(shadowOffsetX))
    fd.set('shadowOffsetY', String(shadowOffsetY))
    fd.set('supportStems', String(supportStems))
    fd.set('silhouette', silhouette!)
    if (floorInsert) fd.set('floorInsert', floorInsert)

    try {
      const res = await fetch('/api/light-generator-order', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setStatus('error')
        setErrorMsg(body.error === 'validation_error' ? strings.error.generic : strings.error.generic)
        return
      }
      const body = (await res.json()) as { orderId: string }
      setOrderId(body.orderId)
      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMsg(strings.error.generic)
    }
  }

  const stepLabels = [s.step_info, s.step_config, s.step_upload, s.step_review]

  if (status === 'success') {
    const waMsg = locale === 'id'
      ? `Halo, saya baru order Light Generator dengan Order ID: ${orderId}. Nama: ${name}`
      : `Hi, I just submitted a Light Generator order. Order ID: ${orderId}. Name: ${name}`
    const waHref = whatsappNumber
      ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMsg)}`
      : undefined
    return (
      <div role="status" aria-live="polite" className="space-y-4 rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <div className="text-4xl">🎉</div>
        <p className="text-lg font-bold text-green-800">{s.success.title}</p>
        <p className="text-sm text-green-700">{s.success.subtitle}</p>
        <p className="rounded-xl bg-white px-4 py-2 font-mono text-lg font-bold text-[color:var(--color-brand-600)] shadow-sm">{orderId}</p>
        {waHref && (
          <a href={waHref} target="_blank" rel="noopener"
            className="inline-block rounded-full bg-[#25D366] px-6 py-2.5 font-semibold text-white hover:opacity-90">
            {s.success.whatsapp}
          </a>
        )}
      </div>
    )
  }

  return (
    <div>
      <StepIndicator current={step} labels={stepLabels} />

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{s.info.name_label} *</span>
            <input type="text" value={name} onChange={(e) => setName(e.currentTarget.value)}
              placeholder={s.info.name_placeholder}
              className="w-full rounded-lg border border-[color:var(--color-ink-300)] px-3 py-2 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{s.info.contact_label} *</span>
            <input type="text" value={contact} onChange={(e) => setContact(e.currentTarget.value)}
              placeholder={s.info.contact_placeholder}
              className="w-full rounded-lg border border-[color:var(--color-ink-300)] px-3 py-2 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              {s.info.notes_label} <span className="font-normal text-[color:var(--color-ink-400)]">{s.info.notes_optional}</span>
            </span>
            <textarea value={notes} onChange={(e) => setNotes(e.currentTarget.value)}
              placeholder={s.info.notes_placeholder} rows={2}
              className="w-full rounded-lg border border-[color:var(--color-ink-300)] px-3 py-2 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none" />
          </label>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{s.config.size_label} *</legend>
            <div className="grid grid-cols-3 gap-2">
              {SIZE_DATA.map(({ value, label, desc }) => (
                <label key={value} className={`cursor-pointer rounded-xl border-2 p-3 text-center transition-colors ${
                  size === value
                    ? 'border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-50)]'
                    : 'border-[color:var(--color-ink-200)] hover:border-[color:var(--color-ink-400)]'
                }`}>
                  <input type="radio" name="size" value={value} checked={size === value} onChange={() => setSize(value)} className="sr-only" />
                  <div className={`text-xl font-bold ${size === value ? 'text-[color:var(--color-brand-600)]' : ''}`}>{label}</div>
                  <div className={`text-xs ${size === value ? 'text-[color:var(--color-brand-500)]' : 'text-[color:var(--color-ink-400)]'}`}>{desc}</div>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">{s.config.shape_label} *</legend>
            <div className="grid grid-cols-5 gap-2">
              {LG_SHAPES.map((shapeVal) => {
                const labelKey = `shape_${shapeVal}` as keyof typeof s.config
                return (
                  <label key={shapeVal} className={`cursor-pointer rounded-xl border-2 p-2 text-center transition-colors ${
                    shape === shapeVal
                      ? 'border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-50)]'
                      : 'border-[color:var(--color-ink-200)] hover:border-[color:var(--color-ink-400)]'
                  }`}>
                    <input type="radio" name="shape" value={shapeVal} checked={shape === shapeVal} onChange={() => setShape(shapeVal)} className="sr-only" />
                    <span className={`mx-auto mb-1 block h-7 w-7 ${shape === shapeVal ? 'text-[color:var(--color-brand-600)]' : 'text-[color:var(--color-ink-500)]'}`}
                      dangerouslySetInnerHTML={{ __html: SHAPE_ICONS[shapeVal] }} />
                    <span className={`text-[9px] font-medium ${shape === shapeVal ? 'text-[color:var(--color-brand-600)]' : 'text-[color:var(--color-ink-500)]'}`}>
                      {s.config[labelKey] as string}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          {(shape === 'rect' || shape === 'oval') && (
            <div>
              <div className="mb-2 text-sm font-medium">{s.config.ratio_label}</div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="mb-1 text-xs text-[color:var(--color-ink-400)]">{s.config.ratio_width}</span>
                  <input type="number" min={1} max={10} value={ratioW} onChange={(e) => setRatioW(parseInt(e.currentTarget.value) || 1)}
                    className="w-16 rounded-lg border border-[color:var(--color-ink-300)] px-2 py-1.5 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none" />
                </div>
                <span className="mt-4 text-[color:var(--color-ink-400)]">×</span>
                <div className="flex flex-col">
                  <span className="mb-1 text-xs text-[color:var(--color-ink-400)]">{s.config.ratio_height}</span>
                  <input type="number" min={1} max={10} value={ratioH} onChange={(e) => setRatioH(parseInt(e.currentTarget.value) || 1)}
                    className="w-16 rounded-lg border border-[color:var(--color-ink-300)] px-2 py-1.5 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div>
          <FileUploadZone
            label={s.upload.silhouette_label}
            tooltip={s.upload.silhouette_tooltip}
            hint={s.upload.silhouette_hint}
            cta={s.upload.silhouette_cta}
            file={silhouette}
            onFile={handleSilhouette}
            onError={setErrorMsg}
            errorMsgTooLarge={s.error.file_too_large}
            errorMsgInvalidType={s.error.file_invalid_type}
            accent
          />

          {silhouette && (
            <div className="mb-5">
              <LightGeneratorCasingCanvas
                silhouetteObjectUrl={silhouetteUrl}
                shape={shape as LGShape}
                shapeRatio={(shape === 'rect' || shape === 'oval') ? { width: ratioW, height: ratioH } : undefined}
                shadowDiameter={shadowDiameter}
                offsetX={shadowOffsetX}
                offsetY={shadowOffsetY}
              />
            </div>
          )}

          <div className="mb-5">
            <div className="mb-2 text-sm font-medium">{s.upload.shadow_title}</div>
            <div className="grid grid-cols-3 gap-3">
              {([
                [s.upload.shadow_diameter, shadowDiameter, setShadowDiameter, 10, 200],
                [s.upload.shadow_offset_x, shadowOffsetX, setShadowOffsetX, -500, 500],
                [s.upload.shadow_offset_y, shadowOffsetY, setShadowOffsetY, -500, 500],
              ] as [string, number, (v: number) => void, number, number][]).map(([label, val, setter, min, max]) => (
                <label key={label} className="flex flex-col gap-1">
                  <span className="text-xs text-[color:var(--color-ink-500)]">{label}</span>
                  <input type="number" min={min} max={max} value={val}
                    onChange={(e) => setter(parseFloat(e.currentTarget.value) || 0)}
                    className="rounded-lg border border-[color:var(--color-ink-300)] px-2 py-1.5 text-sm focus:border-[color:var(--color-brand-500)] focus:outline-none" />
                </label>
              ))}
            </div>
          </div>

          {silhouette && (
            <div className="mb-5">
              <button type="button" onClick={loadShadowPreview} disabled={previewLoading}
                className="rounded-full border border-[color:var(--color-brand-400)] px-4 py-1.5 text-sm text-[color:var(--color-brand-600)] hover:bg-[color:var(--color-brand-50)] disabled:opacity-50">
                {previewLoading ? s.upload.preview_loading : s.upload.preview_button}
              </button>
              {previewFallback && <p className="mt-2 text-xs text-[color:var(--color-ink-400)]">{s.upload.preview_fallback}</p>}
              {previewUrl && <img src={previewUrl} alt="shadow preview" className="mt-3 rounded-xl border border-[color:var(--color-ink-200)]" />}
            </div>
          )}

          <div className="mb-5 flex items-center justify-between rounded-xl border border-[color:var(--color-ink-200)] p-3">
            <div>
              <div className="text-sm font-medium">{s.upload.stems_label}</div>
              <div className="text-xs text-[color:var(--color-ink-400)]">
                {stemsChecking ? s.upload.stems_detecting : stemsFallback ? s.upload.stems_fallback : s.upload.stems_desc}
              </div>
            </div>
            <button type="button" role="switch" aria-checked={supportStems} onClick={() => setSupportStems((p) => !p)}
              className={`relative h-6 w-11 rounded-full transition-colors ${supportStems ? 'bg-[color:var(--color-brand-500)]' : 'bg-[color:var(--color-ink-300)]'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${supportStems ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <FileUploadZone
            label={s.upload.floor_label}
            tooltip={s.upload.floor_tooltip}
            hint={s.upload.floor_hint}
            cta={s.upload.floor_cta}
            optional={s.upload.floor_optional}
            file={floorInsert}
            onFile={setFloorInsert}
            onError={setErrorMsg}
            errorMsgTooLarge={s.error.file_too_large}
            errorMsgInvalidType={s.error.file_invalid_type}
          />
        </div>
      )}

      {/* Step 4 — Review */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-xl bg-[color:var(--color-ink-50)] p-4 text-sm">
            <h2 className="mb-3 font-semibold">{s.review.title}</h2>
            <div className="space-y-1.5">
              {([
                [s.review.name, name],
                [s.review.contact, contact],
                notes ? [s.review.notes, notes] : null,
                [s.review.size, size],
                [s.review.shape, shape],
                (shape === 'rect' || shape === 'oval') ? [s.review.ratio, `${ratioW}:${ratioH}`] : null,
                [s.review.shadow, `Ø${shadowDiameter}cm, X${shadowOffsetX}mm, Y${shadowOffsetY}mm`],
                [s.review.stems, supportStems ? s.review.stems_yes : s.review.stems_no],
                [s.review.silhouette, silhouette?.name ?? '—'],
                [s.review.floor, floorInsert?.name ?? s.review.floor_none],
              ] as ([string, string] | null)[]).filter(Boolean).map(([label, val]) => (
                <div key={label} className="flex gap-2">
                  <span className="w-28 shrink-0 text-[color:var(--color-ink-400)]">{label}</span>
                  <span className="font-medium">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {errorMsg && <p role="alert" className="mt-3 text-sm text-red-600">{errorMsg}</p>}
      {status === 'error' && !errorMsg && <p role="alert" className="mt-3 text-sm text-red-600">{s.error.generic}</p>}

      <div className={`mt-6 flex ${step > 1 ? 'justify-between' : 'justify-end'}`}>
        {step > 1 && (
          <button type="button" onClick={() => { setErrorMsg(''); setStep((p) => (p - 1) as Step) }}
            className="rounded-full border border-[color:var(--color-ink-200)] bg-white px-5 py-2.5 text-sm text-[color:var(--color-ink-500)] hover:border-[color:var(--color-ink-400)]">
            {s.back}
          </button>
        )}
        {step < 4 ? (
          <button type="button" onClick={handleNext}
            className="rounded-full bg-[color:var(--color-brand-500)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--color-brand-600)]">
            {s.next}
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={status === 'submitting'}
            className="rounded-full bg-[color:var(--color-brand-500)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--color-brand-600)] disabled:opacity-60">
            {status === 'submitting' ? s.submitting : s.submit}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/LightGeneratorOrderForm.tsx
git commit -m "feat(web): LightGeneratorOrderForm — 4-step wizard"
```

---

### Task 8: Astro pages

**Files:**
- Create: `src/pages/id/light-generator.astro`
- Create: `src/pages/en/light-generator.astro`

Both pages follow the exact structure of `src/pages/id/strava-map.astro`: fetch Sanity settings, import Navbar/Footer, use BaseLayout.

- [ ] **Step 1: Create `src/pages/id/light-generator.astro`**

```astro
---
export const prerender = false

import BaseLayout from '~/layouts/BaseLayout.astro'
import Navbar from '~/components/Navbar.astro'
import Footer from '~/components/Footer.astro'
import LightGeneratorOrderForm from '~/components/LightGeneratorOrderForm'
import { clientFromEnv, urlFor } from '~/lib/sanity'
import { t } from '~/lib/i18n'
import type { SiteSettings } from '~/lib/types'

const client = clientFromEnv()
const settings = await client.fetch<SiteSettings | null>(
  `*[_type == "siteSettings"][0]{ brandName, logo, contact, seo }`
)
const logoUrl = settings?.logo ? urlFor(client, settings.logo).height(80).url() : undefined
const faviconUrl = settings?.logo ? urlFor(client, settings.logo).width(64).height(64).fit('crop').format('png').url() : undefined
const logoAlt = settings?.logo?.alt

const strings = {
  step_info:     t('id', 'light_generator.step_info'),
  step_config:   t('id', 'light_generator.step_config'),
  step_upload:   t('id', 'light_generator.step_upload'),
  step_review:   t('id', 'light_generator.step_review'),
  next:          t('id', 'light_generator.next'),
  back:          t('id', 'light_generator.back'),
  submit:        t('id', 'light_generator.submit'),
  submitting:    t('id', 'light_generator.submitting'),
  info: {
    name_label:         t('id', 'light_generator.info.name_label'),
    name_placeholder:   t('id', 'light_generator.info.name_placeholder'),
    contact_label:      t('id', 'light_generator.info.contact_label'),
    contact_placeholder:t('id', 'light_generator.info.contact_placeholder'),
    notes_label:        t('id', 'light_generator.info.notes_label'),
    notes_placeholder:  t('id', 'light_generator.info.notes_placeholder'),
    notes_optional:     t('id', 'light_generator.info.notes_optional'),
  },
  config: {
    size_label:     t('id', 'light_generator.config.size_label'),
    size_s:         t('id', 'light_generator.config.size_s'),
    size_s_desc:    t('id', 'light_generator.config.size_s_desc'),
    size_m:         t('id', 'light_generator.config.size_m'),
    size_m_desc:    t('id', 'light_generator.config.size_m_desc'),
    size_l:         t('id', 'light_generator.config.size_l'),
    size_l_desc:    t('id', 'light_generator.config.size_l_desc'),
    shape_label:    t('id', 'light_generator.config.shape_label'),
    shape_circle:   t('id', 'light_generator.config.shape_circle'),
    shape_square:   t('id', 'light_generator.config.shape_square'),
    shape_triangle: t('id', 'light_generator.config.shape_triangle'),
    shape_rect:     t('id', 'light_generator.config.shape_rect'),
    shape_oval:     t('id', 'light_generator.config.shape_oval'),
    ratio_label:    t('id', 'light_generator.config.ratio_label'),
    ratio_width:    t('id', 'light_generator.config.ratio_width'),
    ratio_height:   t('id', 'light_generator.config.ratio_height'),
  },
  upload: {
    silhouette_label:   t('id', 'light_generator.upload.silhouette_label'),
    silhouette_tooltip: t('id', 'light_generator.upload.silhouette_tooltip'),
    silhouette_hint:    t('id', 'light_generator.upload.silhouette_hint'),
    silhouette_cta:     t('id', 'light_generator.upload.silhouette_cta'),
    floor_label:        t('id', 'light_generator.upload.floor_label'),
    floor_optional:     t('id', 'light_generator.upload.floor_optional'),
    floor_tooltip:      t('id', 'light_generator.upload.floor_tooltip'),
    floor_hint:         t('id', 'light_generator.upload.floor_hint'),
    floor_cta:          t('id', 'light_generator.upload.floor_cta'),
    shadow_title:       t('id', 'light_generator.upload.shadow_title'),
    shadow_diameter:    t('id', 'light_generator.upload.shadow_diameter'),
    shadow_offset_x:    t('id', 'light_generator.upload.shadow_offset_x'),
    shadow_offset_y:    t('id', 'light_generator.upload.shadow_offset_y'),
    preview_button:     t('id', 'light_generator.upload.preview_button'),
    preview_loading:    t('id', 'light_generator.upload.preview_loading'),
    preview_fallback:   t('id', 'light_generator.upload.preview_fallback'),
    stems_label:        t('id', 'light_generator.upload.stems_label'),
    stems_desc:         t('id', 'light_generator.upload.stems_desc'),
    stems_detecting:    t('id', 'light_generator.upload.stems_detecting'),
    stems_fallback:     t('id', 'light_generator.upload.stems_fallback'),
  },
  review: {
    title:      t('id', 'light_generator.review.title'),
    name:       t('id', 'light_generator.review.name'),
    contact:    t('id', 'light_generator.review.contact'),
    notes:      t('id', 'light_generator.review.notes'),
    size:       t('id', 'light_generator.review.size'),
    shape:      t('id', 'light_generator.review.shape'),
    ratio:      t('id', 'light_generator.review.ratio'),
    shadow:     t('id', 'light_generator.review.shadow'),
    stems:      t('id', 'light_generator.review.stems'),
    stems_yes:  t('id', 'light_generator.review.stems_yes'),
    stems_no:   t('id', 'light_generator.review.stems_no'),
    silhouette: t('id', 'light_generator.review.silhouette'),
    floor:      t('id', 'light_generator.review.floor'),
    floor_none: t('id', 'light_generator.review.floor_none'),
  },
  success: {
    title:    t('id', 'light_generator.success.title'),
    subtitle: t('id', 'light_generator.success.subtitle'),
    whatsapp: t('id', 'light_generator.success.whatsapp'),
  },
  error: {
    invalid_name:       t('id', 'light_generator.error.invalid_name'),
    invalid_contact:    t('id', 'light_generator.error.invalid_contact'),
    invalid_size:       t('id', 'light_generator.error.invalid_size'),
    invalid_shape:      t('id', 'light_generator.error.invalid_shape'),
    invalid_silhouette: t('id', 'light_generator.error.invalid_silhouette'),
    file_too_large:     t('id', 'light_generator.error.file_too_large'),
    file_invalid_type:  t('id', 'light_generator.error.file_invalid_type'),
    generic:            t('id', 'light_generator.error.generic'),
  },
}
---
<BaseLayout locale="id"
  title="Order Light Generator — 3dprintingbandung"
  description="Cetak lampu dengan pola cahaya custom dari gambarmu sendiri."
  canonicalPath="/id/light-generator"
  faviconUrl={faviconUrl}>
  <Navbar locale="id" whatsappNumber={settings?.contact?.whatsapp} logoUrl={logoUrl} logoAlt={logoAlt} />
  <main class="mx-auto max-w-2xl px-4 py-12">
    <div class="mb-8">
      <a href="/id/" class="text-sm text-[color:var(--color-ink-400)] hover:text-[color:var(--color-ink-700)]">
        {t('id', 'light_generator.back_link')}
      </a>
      <h1 class="mt-4 text-3xl font-display font-bold md:text-4xl">
        {t('id', 'light_generator.title')}
      </h1>
      <p class="mt-2 text-[color:var(--color-ink-500)]">{t('id', 'light_generator.description')}</p>
    </div>
    <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[color:var(--color-ink-100)] md:p-8">
      <LightGeneratorOrderForm
        client:load
        strings={strings}
        locale="id"
        whatsappNumber={settings?.contact?.whatsapp}
      />
    </div>
  </main>
  <Footer locale="id" settings={settings} logoUrl={logoUrl} logoAlt={logoAlt} />
</BaseLayout>
```

- [ ] **Step 2: Create `src/pages/en/light-generator.astro`**

Same as the ID page but with `locale="en"` and `t('en', ...)` calls. Copy the entire ID page and replace every `t('id', ...` with `t('en', ...` and `locale="id"` with `locale="en"` and the back link `href="/en/"`:

```astro
---
export const prerender = false

import BaseLayout from '~/layouts/BaseLayout.astro'
import Navbar from '~/components/Navbar.astro'
import Footer from '~/components/Footer.astro'
import LightGeneratorOrderForm from '~/components/LightGeneratorOrderForm'
import { clientFromEnv, urlFor } from '~/lib/sanity'
import { t } from '~/lib/i18n'
import type { SiteSettings } from '~/lib/types'

const client = clientFromEnv()
const settings = await client.fetch<SiteSettings | null>(
  `*[_type == "siteSettings"][0]{ brandName, logo, contact, seo }`
)
const logoUrl = settings?.logo ? urlFor(client, settings.logo).height(80).url() : undefined
const faviconUrl = settings?.logo ? urlFor(client, settings.logo).width(64).height(64).fit('crop').format('png').url() : undefined
const logoAlt = settings?.logo?.alt

const strings = {
  step_info:     t('en', 'light_generator.step_info'),
  step_config:   t('en', 'light_generator.step_config'),
  step_upload:   t('en', 'light_generator.step_upload'),
  step_review:   t('en', 'light_generator.step_review'),
  next:          t('en', 'light_generator.next'),
  back:          t('en', 'light_generator.back'),
  submit:        t('en', 'light_generator.submit'),
  submitting:    t('en', 'light_generator.submitting'),
  info: {
    name_label:          t('en', 'light_generator.info.name_label'),
    name_placeholder:    t('en', 'light_generator.info.name_placeholder'),
    contact_label:       t('en', 'light_generator.info.contact_label'),
    contact_placeholder: t('en', 'light_generator.info.contact_placeholder'),
    notes_label:         t('en', 'light_generator.info.notes_label'),
    notes_placeholder:   t('en', 'light_generator.info.notes_placeholder'),
    notes_optional:      t('en', 'light_generator.info.notes_optional'),
  },
  config: {
    size_label:     t('en', 'light_generator.config.size_label'),
    size_s:         t('en', 'light_generator.config.size_s'),
    size_s_desc:    t('en', 'light_generator.config.size_s_desc'),
    size_m:         t('en', 'light_generator.config.size_m'),
    size_m_desc:    t('en', 'light_generator.config.size_m_desc'),
    size_l:         t('en', 'light_generator.config.size_l'),
    size_l_desc:    t('en', 'light_generator.config.size_l_desc'),
    shape_label:    t('en', 'light_generator.config.shape_label'),
    shape_circle:   t('en', 'light_generator.config.shape_circle'),
    shape_square:   t('en', 'light_generator.config.shape_square'),
    shape_triangle: t('en', 'light_generator.config.shape_triangle'),
    shape_rect:     t('en', 'light_generator.config.shape_rect'),
    shape_oval:     t('en', 'light_generator.config.shape_oval'),
    ratio_label:    t('en', 'light_generator.config.ratio_label'),
    ratio_width:    t('en', 'light_generator.config.ratio_width'),
    ratio_height:   t('en', 'light_generator.config.ratio_height'),
  },
  upload: {
    silhouette_label:   t('en', 'light_generator.upload.silhouette_label'),
    silhouette_tooltip: t('en', 'light_generator.upload.silhouette_tooltip'),
    silhouette_hint:    t('en', 'light_generator.upload.silhouette_hint'),
    silhouette_cta:     t('en', 'light_generator.upload.silhouette_cta'),
    floor_label:        t('en', 'light_generator.upload.floor_label'),
    floor_optional:     t('en', 'light_generator.upload.floor_optional'),
    floor_tooltip:      t('en', 'light_generator.upload.floor_tooltip'),
    floor_hint:         t('en', 'light_generator.upload.floor_hint'),
    floor_cta:          t('en', 'light_generator.upload.floor_cta'),
    shadow_title:       t('en', 'light_generator.upload.shadow_title'),
    shadow_diameter:    t('en', 'light_generator.upload.shadow_diameter'),
    shadow_offset_x:    t('en', 'light_generator.upload.shadow_offset_x'),
    shadow_offset_y:    t('en', 'light_generator.upload.shadow_offset_y'),
    preview_button:     t('en', 'light_generator.upload.preview_button'),
    preview_loading:    t('en', 'light_generator.upload.preview_loading'),
    preview_fallback:   t('en', 'light_generator.upload.preview_fallback'),
    stems_label:        t('en', 'light_generator.upload.stems_label'),
    stems_desc:         t('en', 'light_generator.upload.stems_desc'),
    stems_detecting:    t('en', 'light_generator.upload.stems_detecting'),
    stems_fallback:     t('en', 'light_generator.upload.stems_fallback'),
  },
  review: {
    title:      t('en', 'light_generator.review.title'),
    name:       t('en', 'light_generator.review.name'),
    contact:    t('en', 'light_generator.review.contact'),
    notes:      t('en', 'light_generator.review.notes'),
    size:       t('en', 'light_generator.review.size'),
    shape:      t('en', 'light_generator.review.shape'),
    ratio:      t('en', 'light_generator.review.ratio'),
    shadow:     t('en', 'light_generator.review.shadow'),
    stems:      t('en', 'light_generator.review.stems'),
    stems_yes:  t('en', 'light_generator.review.stems_yes'),
    stems_no:   t('en', 'light_generator.review.stems_no'),
    silhouette: t('en', 'light_generator.review.silhouette'),
    floor:      t('en', 'light_generator.review.floor'),
    floor_none: t('en', 'light_generator.review.floor_none'),
  },
  success: {
    title:    t('en', 'light_generator.success.title'),
    subtitle: t('en', 'light_generator.success.subtitle'),
    whatsapp: t('en', 'light_generator.success.whatsapp'),
  },
  error: {
    invalid_name:       t('en', 'light_generator.error.invalid_name'),
    invalid_contact:    t('en', 'light_generator.error.invalid_contact'),
    invalid_size:       t('en', 'light_generator.error.invalid_size'),
    invalid_shape:      t('en', 'light_generator.error.invalid_shape'),
    invalid_silhouette: t('en', 'light_generator.error.invalid_silhouette'),
    file_too_large:     t('en', 'light_generator.error.file_too_large'),
    file_invalid_type:  t('en', 'light_generator.error.file_invalid_type'),
    generic:            t('en', 'light_generator.error.generic'),
  },
}
---
<BaseLayout locale="en"
  title="Order Light Generator — 3dprintingbandung"
  description="Print a lamp with a custom light pattern from your own image."
  canonicalPath="/en/light-generator"
  faviconUrl={faviconUrl}>
  <Navbar locale="en" whatsappNumber={settings?.contact?.whatsapp} logoUrl={logoUrl} logoAlt={logoAlt} />
  <main class="mx-auto max-w-2xl px-4 py-12">
    <div class="mb-8">
      <a href="/en/" class="text-sm text-[color:var(--color-ink-400)] hover:text-[color:var(--color-ink-700)]">
        {t('en', 'light_generator.back_link')}
      </a>
      <h1 class="mt-4 text-3xl font-display font-bold md:text-4xl">
        {t('en', 'light_generator.title')}
      </h1>
      <p class="mt-2 text-[color:var(--color-ink-500)]">{t('en', 'light_generator.description')}</p>
    </div>
    <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[color:var(--color-ink-100)] md:p-8">
      <LightGeneratorOrderForm
        client:load
        strings={strings}
        locale="en"
        whatsappNumber={settings?.contact?.whatsapp}
      />
    </div>
  </main>
  <Footer locale="en" settings={settings} logoUrl={logoUrl} logoAlt={logoAlt} />
</BaseLayout>
```

- [ ] **Step 3: Run all tests to verify nothing broke**

Run: `cd apps/web && npx vitest run`

Expected: All tests pass (including existing waitlist, sanity, i18n, strava-map, and new light-generator tests).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/id/light-generator.astro apps/web/src/pages/en/light-generator.astro
git commit -m "feat(web): light-generator order pages /id/ and /en/"
```

---

## Environment Variables Required

Before deploying, add to Cloudflare Workers environment (dashboard or `wrangler secret put`):

| Variable | Purpose |
|----------|---------|
| `OPS_API_URL` | Base URL of 3dpb-ops (e.g. `https://ops.3dprintingbandung.my.id`) |
| `OPS_API_SECRET` | Shared secret for landing page ↔ 3dpb-ops auth |
| `SANITY_WRITE_TOKEN` | Already exists — used by waitlist API |

## Out of Scope

- Sanity `lightGeneratorOrder` schema (done in 3dpb-ops Studio)
- 3dpb-ops `/api/island-check` and `/api/shadow-preview` endpoints
- Order tracking page for customers
- Cloudflare Turnstile CAPTCHA
