# Light Generator Order Form — Design Spec

**Date:** 2026-05-25
**Scope:** `apps/web` — halaman order form light generator + Sanity backend

## Goal

Migrate order form light generator dari `light-generator` project ke landing page 3DPB. Data order tersimpan di Sanity Cloud sehingga order tetap masuk meski homelab mati.

## Order Lifecycle

```
Customer submit form
  └─▶ Sanity (status: "submitted")  ← landing page write ke sini
         │
         ▼
  3dpb-ops confirm order
  └─▶ Copy data Sanity → local DB 3dpb-ops (untuk processing)
         │
         ▼
  Setiap update status (paid / generating / ready / shipped / cancelled)
  └─▶ 3dpb-ops write status terbaru ke Sanity
```

**Implikasi untuk landing page:**
- Landing page hanya **write sekali** saat submit (status: `submitted`)
- Update status adalah tanggung jawab 3dpb-ops, bukan landing page
- Field `status` di Sanity akan diupdate oleh 3dpb-ops — schema harus support write dari dua sumber

## Architecture

```
/id/light-generator   (Astro page, i18n)
/en/light-generator

  LightGeneratorOrderForm.tsx  (React, client-side wizard)
    Step 1: Info Customer
    Step 2: Konfigurasi (ukuran, bentuk, shadow, support stems)
    Step 3: Upload (silhouette required, floor insert optional)
    Step 4: Review & Submit

  /api/light-generator-island-check  (CF Worker, POST)
    → Proxy ke 3dpb-ops API dengan shared secret
    → Fallback manual toggle jika 3dpb-ops unavailable

  /api/light-generator-order  (CF Worker, POST, multipart FormData)
    → Validate (Zod)
    → Upload images ke Sanity Assets
    → Create lightGeneratorOrder document di Sanity
    → Return { orderId }

Sanity Studio (di 3dpb-ops, bukan apps/studio)
  → lightGeneratorOrder schema untuk view & manage orders
```

## Form — Multi-Step Wizard

Layout dan style mengikuti `StravaMapOrderForm.tsx` — `var(--color-brand-*)`, radio card pattern, Tailwind classes.

### Step 1: Info Customer
| Field | Type | Validasi |
|-------|------|----------|
| Nama lengkap | text | 2–100 karakter, required |
| WhatsApp / Instagram | text | 5–100 karakter, required |
| Catatan | textarea | opsional, maks 500 karakter |

### Step 2: Konfigurasi
| Field | Type | Validasi |
|-------|------|----------|
| Ukuran | radio card: S / M / L | required (S=Ø10cm, M=Ø14cm, L=Ø20cm) |
| Bentuk | radio card: circle / square / triangle / rect / oval | required |
| Rasio bentuk | number W + H | hanya muncul jika shape = rect atau oval |
| Shadow diameter | number (cm) | 10–200, default 15 |
| Shadow offset X | number (mm) | -500 – +500, default 0 |
| Shadow offset Y | number (mm) | -500 – +500, default 0 |
### Step 3: Upload Gambar

**Gambar Desain** (required)
- Label: "Gambar Desain *"
- Tooltip: Gambar yang akan dijadikan pola cahaya lampu. Contoh: logo, siluet hewan, karakter, desain custom. Tips: gunakan gambar high-contrast (hitam putih) untuk hasil terbaik.
- Format: PNG / JPG / WebP, maks 5 MB

**Gambar Alas** (optional)
- Label: "Gambar Alas (opsional)"
- Tooltip: Gambar yang dicetak pada alas/lantai lampu — bagian bawah yang kelihatan dari atas. Contoh: nama, tanggal spesial, motif. Kalau tidak diisi, alas akan polos.
- Format: PNG / JPG / WebP, maks 5 MB

Kedua field pakai drag-and-drop + click-to-browse. Preview thumbnail setelah file dipilih.

**Support Stems** (di bawah upload silhouette, setelah file dipilih)
- Toggle default OFF
- Setelah silhouette dipilih, otomatis call `/api/light-generator-island-check`
  - Jika 3dpb-ops available → toggle auto-set sesuai hasil, user bisa override
  - Jika fallback → tampil hint "deteksi otomatis tidak tersedia, aktifkan manual jika gambar punya bagian yang terpisah-pisah"

### Step 4: Review & Submit

Summary semua input sebelum submit. Tombol "Kirim Order" submit ke `/api/light-generator-order`.

**Success state:**
- Tampil orderId
- Tombol WhatsApp: buka wa.me dengan pesan pre-filled berisi nama + orderId

## Sanity Schema — `lightGeneratorOrder`

Didaftarkan di **3dpb-ops Studio**, bukan `apps/studio`.

```ts
{
  name: 'lightGeneratorOrder',
  fields: [
    { name: 'orderId',          type: 'string' },   // "LG-YYYYMMDD-XXXX"
    { name: 'status',           type: 'string' },   // submitted|paid|generating|ready|shipped|cancelled
    { name: 'customerName',     type: 'string' },
    { name: 'customerContact',  type: 'string' },
    { name: 'customerNotes',    type: 'text',    optional: true },
    { name: 'config',           type: 'text' },     // JSON blob — snapshot konfigurasi order
    { name: 'silhouetteImage',  type: 'image' },    // Sanity asset
    { name: 'floorInsertImage', type: 'image',  optional: true },
    { name: 'statusNote',       type: 'text',    optional: true },  // note dari operator, ditampilkan di tracking customer
    { name: 'submittedAt',      type: 'datetime' },
  ]
}
```

Struktur `config` JSON:
```json
{
  "size": "M",
  "shape": "rect",
  "shapeRatio": { "width": 3, "height": 2 },
  "shadow": { "diameter": 15, "offsetX": 0, "offsetY": 0 },
  "supportStems": true
}
```

## API Routes

### `POST /api/light-generator-order`

Input: `multipart/form-data`
```
name, contact, notes?,
size, shape, shapeRatioW?, shapeRatioH?,
shadowDiameter, shadowOffsetX, shadowOffsetY,
supportStems,
silhouette (File), floorInsert? (File)
```

Flow:
1. Validate dengan Zod (server-side)
2. Upload `silhouette` → Sanity Assets via `client.assets.upload('image', file)`
3. Upload `floorInsert` jika ada → Sanity Assets
4. Generate `orderId = "LG-" + YYYYMMDD + "-" + random(4 uppercase)`
5. `client.create({ _type: 'lightGeneratorOrder', orderId, status: 'submitted', ... })`
6. Return `201 { orderId }`

Error responses:
- `400 { error: 'validation_error', fields: [...] }` — input invalid
- `500 { error: 'server_error' }` — Sanity write gagal

### `POST /api/light-generator-island-check`

Input: `{ imageAssetId: string }` — Sanity asset ID dari silhouette yang sudah diupload

Flow:
1. Call `https://<3dpb-ops-url>/api/island-check` dengan header `Authorization: Bearer OPS_API_SECRET`
2. Timeout: 5 detik
3. Success → return `{ hasFloatingIslands: boolean }`
4. Timeout / error → return `{ hasFloatingIslands: null, fallback: true }`

## Environment Variables

| Variable | Keterangan |
|----------|-----------|
| `SANITY_WRITE_TOKEN` | Sudah ada, dipakai juga oleh waitlist API |
| `OPS_API_SECRET` | Shared secret untuk komunikasi ke 3dpb-ops (baru) |

## Files

| File | Action |
|------|--------|
| `src/pages/id/light-generator.astro` | Create |
| `src/pages/en/light-generator.astro` | Create |
| `src/pages/api/light-generator-order.ts` | Create |
| `src/pages/api/light-generator-island-check.ts` | Create |
| `src/components/LightGeneratorOrderForm.tsx` | Create |
| `src/i18n/id.json` | Modify — tambah strings light generator |
| `src/i18n/en.json` | Modify — tambah strings light generator |

## Out of Scope

- Sanity Studio schema (dikerjakan di 3dpb-ops)
- Payment flow
- STL generation
- Notifikasi BullMQ (dikerjakan di 3dpb-ops)
- Cloudflare Turnstile CAPTCHA (bisa ditambah nanti)
- 3dpb-ops `/api/island-check` endpoint (dikerjakan di 3dpb-ops)
- Halaman order tracking customer (spec terpisah) — akan membaca `status` + `statusNote` dari Sanity by orderId
