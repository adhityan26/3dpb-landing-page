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
  └─▶ 3dpb-ops write status terbaru + statusNote ke Sanity
```

**Implikasi untuk landing page:**
- Landing page hanya **write sekali** saat submit (status: `submitted`)
- Update status dan statusNote adalah tanggung jawab 3dpb-ops
- Field `status` di Sanity akan diupdate oleh 3dpb-ops — schema support write dari dua sumber

## Architecture

```
/id/light-generator   (Astro page, i18n)
/en/light-generator

  LightGeneratorOrderForm.tsx  (React, client-side wizard)
    Step 1: Info Customer
    Step 2: Ukuran & Bentuk
    Step 3: Upload + Shadow Config + Preview
    Step 4: Review & Submit

  /api/light-generator-island-check  (CF Worker, POST)
    → Proxy ke 3dpb-ops dengan shared secret
    → Fallback: { fallback: true } jika unavailable

  /api/light-generator-shadow-preview  (CF Worker, POST)
    → Proxy ke 3dpb-ops dengan shared secret
    → Fallback: canvas configurator saja jika unavailable

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

### Step 2: Ukuran & Bentuk
| Field | Type | Validasi |
|-------|------|----------|
| Ukuran | radio card: S / M / L | required (S=Ø10cm, M=Ø14cm, L=Ø20cm) |
| Bentuk | radio card: circle / square / triangle / rect / oval | required |
| Rasio bentuk | number W + H | hanya muncul jika shape = rect atau oval |

### Step 3: Upload + Shadow Config + Preview

Urutan komponen dalam step ini:

**1. Gambar Desain** (required)
- Label: "Gambar Desain *"
- Tooltip: Gambar yang akan dijadikan pola cahaya lampu. Contoh: logo, siluet hewan, karakter, desain custom. Tips: gunakan gambar high-contrast (hitam putih) untuk hasil terbaik.
- Format: PNG / JPG / WebP, maks 5 MB
- Drag-and-drop + click-to-browse, thumbnail preview setelah dipilih

**2. Canvas Configurator** (muncul setelah silhouette dipilih)
- Render outline casing di atas gambar silhouette menggunakan HTML5 Canvas
- Menampilkan posisi dan ukuran footprint lampu relatif terhadap gambar
- Pure client-side, tidak butuh backend
- Di-port dari `casing-configurator.tsx` di light-generator

**3. Shadow Config** (di bawah canvas)
| Field | Type | Validasi |
|-------|------|----------|
| Shadow diameter | number (cm) | 10–200, default 15 |
| Shadow offset X | number (mm) | -500 – +500, default 0 |
| Shadow offset Y | number (mm) | -500 – +500, default 0 |

Perubahan pada shadow config langsung update canvas configurator secara real-time.

**4. Rendered Shadow Preview** (tombol opsional)
- Tombol "Lihat Preview Shadow" → call `/api/light-generator-shadow-preview`
- Jika 3dpb-ops available → tampil rendered preview image dari Python microservice
- Jika fallback → tampil pesan "preview render tidak tersedia, gunakan canvas di atas sebagai referensi"

**5. Support Stems**
- Toggle default OFF
- Setelah silhouette dipilih, otomatis call `/api/light-generator-island-check`
  - Jika available → toggle auto-set sesuai hasil, user bisa override
  - Jika fallback → hint "deteksi otomatis tidak tersedia, aktifkan manual jika gambar punya bagian yang terpisah-pisah"

**6. Gambar Alas** (optional)
- Label: "Gambar Alas (opsional)"
- Tooltip: Gambar yang dicetak pada alas/lantai lampu — bagian bawah yang kelihatan dari atas. Contoh: nama, tanggal spesial, motif. Kalau tidak diisi, alas akan polos.
- Format: PNG / JPG / WebP, maks 5 MB

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
    { name: 'statusNote',       type: 'text',    optional: true },  // note operator → ditampilkan di tracking customer
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

## API Routes — Landing Page (apps/web)

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
1. Validate server-side (manual, tanpa Zod)
2. Upload `silhouette` → Sanity Assets via `client.assets.upload('image', file)`
3. Upload `floorInsert` jika ada → Sanity Assets
4. Generate `orderId = "LG-" + YYYYMMDD + "-" + random(4 chars A-Z0-9)`
5. `client.create({ _type: 'lightGeneratorOrder', orderId, status: 'submitted', ... })`
6. Return `201 { orderId }`

Error responses:
- `400 { error: 'validation_error', fields: [...] }` — input invalid
- `500 { error: 'server_error' }` — Sanity write gagal

### `POST /api/light-generator-island-check`

Input: `{ imageAssetId: string }` — Sanity asset ID silhouette

Flow:
1. Call `https://<OPS_API_URL>/api/island-check` dengan header `Authorization: Bearer OPS_API_SECRET`
2. Timeout: 5 detik
3. Success → return `{ hasFloatingIslands: boolean }`
4. Timeout / error → return `{ hasFloatingIslands: null, fallback: true }`

### `POST /api/light-generator-shadow-preview`

Input: `{ imageAssetId: string, config: ShadowConfig }`

```ts
interface ShadowConfig {
  diameter: number   // cm, 10–200
  offsetX: number    // mm, -500 – +500
  offsetY: number    // mm, -500 – +500
}
```

Flow:
1. Call `https://<OPS_API_URL>/api/shadow-preview` dengan header `Authorization: Bearer OPS_API_SECRET`
2. Timeout: 15 detik (render bisa lebih lama)
3. Success → ops return raw PNG bytes (`Content-Type: image/png`) → proxy forward response bytes ke browser
4. Timeout / error → return `{ fallback: true }` (JSON)

Landing page form component membuat blob URL dari response bytes:
```ts
const res = await fetch('/api/light-generator-shadow-preview', { ... })
if (res.ok && res.headers.get('content-type')?.includes('image/png')) {
  const blob = await res.blob()
  setPreviewUrl(URL.createObjectURL(blob))
} else {
  setPreviewFallback(true)
}
```

---

## 3dpb-ops API Contract

> **Bagian ini adalah spesifikasi yang HARUS diimplementasi oleh 3dpb-ops.**
> Landing page akan call endpoint-endpoint ini. Spec ini adalah source of truth.

### Auth

Semua endpoint berikut **tidak dilindungi dashboard auth** (public), tapi wajib memeriksa header:

```
Authorization: Bearer <OPS_API_SECRET>
```

Jika header tidak ada atau salah → return `401 { error: 'unauthorized' }`.

`OPS_API_SECRET` adalah shared secret yang sama antara landing page dan 3dpb-ops — generate dengan `openssl rand -hex 32`, disimpan di kedua env.

---

### `POST /api/island-check`

Digunakan landing page untuk deteksi otomatis apakah silhouette punya bagian yang floating (terpisah-pisah). Jika ada → support stems diperlukan.

**Request:**
```json
{
  "imageAssetId": "image-abc123defg"
}
```

`imageAssetId` adalah Sanity asset ID (`_id` dari asset yang diupload). 3dpb-ops perlu download image dari Sanity CDN menggunakan URL format:
```
https://cdn.sanity.io/images/<projectId>/<dataset>/<assetId_tanpa_prefix_image->
```

Contoh: asset `image-abc123-800x600-png` → URL `https://cdn.sanity.io/images/<projectId>/production/abc123-800x600.png`

**Response sukses (`200`):**
```json
{ "hasFloatingIslands": true }
```
atau
```json
{ "hasFloatingIslands": false }
```

**Response error (`200`, bukan 4xx/5xx — landing page pakai ini sebagai fallback):**
```json
{ "hasFloatingIslands": null, "fallback": true }
```

**Timeout landing page:** 5 detik. Jika 3dpb-ops tidak respond dalam 5 detik, landing page otomatis masuk fallback mode (manual toggle).

---

### `POST /api/shadow-preview`

Digunakan landing page untuk render preview shadow sebelum submit order. 3dpb-ops call Python STL service untuk generate preview image.

**Request:**
```json
{
  "imageAssetId": "image-abc123defg",
  "config": {
    "diameter": 15,
    "offsetX": 0,
    "offsetY": 0
  }
}
```

`config.diameter` dalam cm, `config.offsetX` dan `config.offsetY` dalam mm.

**Response sukses (`200`):**
```
Content-Type: image/png
[raw PNG bytes]
```

3dpb-ops mengembalikan PNG bytes langsung — **bukan JSON, bukan URL**. MinIO hanya digunakan secara internal di 3dpb-ops (tidak diekspos publik). Landing page proxy mem-forward bytes ini ke browser, lalu form component membuat blob URL untuk ditampilkan.

**Response error (`5xx` atau timeout):**

Return HTTP error status (mis. `500`) atau tidak respond dalam 15 detik. Landing page proxy menangkap ini dan return `{ fallback: true }` ke form.

Landing page menampilkan pesan fallback jika menerima fallback atau jika timeout (15 detik).

---

### Sanity Schema — `lightGeneratorOrder`

> Schema ini di-register di **3dpb-ops Sanity Studio**. Landing page hanya write field-field berikut saat submit. 3dpb-ops write `status` dan `statusNote` untuk status updates.

```ts
{
  name: 'lightGeneratorOrder',
  fields: [
    // === Ditulis oleh landing page saat submit ===
    { name: 'orderId',          type: 'string' },
    // Format: "LG-YYYYMMDD-XXXX", contoh: "LG-20260525-A3F7"

    { name: 'status',           type: 'string' },
    // Nilai: 'submitted' | 'paid' | 'generating' | 'ready' | 'shipped' | 'cancelled'
    // Landing page set ke 'submitted'. 3dpb-ops update nilai ini.

    { name: 'customerName',     type: 'string' },
    { name: 'customerContact',  type: 'string' },
    { name: 'customerNotes',    type: 'text',    optional: true },

    { name: 'config',           type: 'text' },
    // JSON blob — snapshot konfigurasi order
    // Struktur: lihat "Struktur config JSON" di bawah

    { name: 'silhouetteImage',  type: 'image' },
    // Sanity image asset — wajib

    { name: 'floorInsertImage', type: 'image',   optional: true },
    // Sanity image asset — opsional

    { name: 'submittedAt',      type: 'datetime' },

    // === Ditulis oleh 3dpb-ops saja ===
    { name: 'statusNote',       type: 'text',    optional: true },
    // Pesan operator → ditampilkan ke customer di halaman tracking
  ]
}
```

**Struktur `config` JSON (ditulis oleh landing page, dibaca oleh 3dpb-ops):**
```json
{
  "size": "M",
  "shape": "rect",
  "shapeRatio": { "width": 3, "height": 2 },
  "shadow": {
    "diameter": 15,
    "offsetX": 0,
    "offsetY": 0
  },
  "supportStems": true
}
```

- `size`: `"S"` | `"M"` | `"L"` — S=Ø10cm, M=Ø14cm, L=Ø20cm
- `shape`: `"circle"` | `"square"` | `"triangle"` | `"rect"` | `"oval"`
- `shapeRatio`: hanya ada jika `shape` adalah `"rect"` atau `"oval"`, `null` atau tidak ada untuk shape lain
- `shadow.diameter`: cm (10–200)
- `shadow.offsetX`, `shadow.offsetY`: mm (-500 – +500)
- `supportStems`: boolean

**Note untuk 3dpb-ops:** `config` adalah satu field `text` berisi JSON string. Saat membaca, parse dengan `JSON.parse(order.config)`. Jangan expect field individual `size`, `shape`, dst. langsung di root Sanity document.

---

### Status Update ke Sanity (oleh 3dpb-ops)

Setiap kali status order berubah, 3dpb-ops wajib write balik ke Sanity:

```ts
await sanityWriteClient
  .patch(sanityDocId)
  .set({
    status: newStatus,        // string
    statusNote: noteText,     // string | undefined
  })
  .commit()
```

`sanityDocId` adalah `_id` Sanity document — disimpan di local DB saat confirm (agar tidak perlu GROQ lookup setiap update).

---

## Environment Variables

### Landing page (`apps/web`)

| Variable | Keterangan |
|----------|-----------|
| `SANITY_WRITE_TOKEN` | Sudah ada, dipakai juga oleh waitlist API |
| `OPS_API_SECRET` | Shared secret — sama persis dengan yang di 3dpb-ops |
| `OPS_API_URL` | Base URL 3dpb-ops, contoh: `https://ops.3dprintingbandung.my.id` |

### 3dpb-ops (tambahan)

| Variable | Keterangan |
|----------|-----------|
| `OPS_API_SECRET` | Shared secret — sama persis dengan yang di landing page |
| `PUBLIC_SANITY_PROJECT_ID` | Untuk download image dari Sanity CDN |
| `PUBLIC_SANITY_DATASET` | Default: `production` |

---

## Files

| File | Action |
|------|--------|
| `src/pages/id/light-generator.astro` | Create |
| `src/pages/en/light-generator.astro` | Create |
| `src/pages/api/light-generator-order.ts` | Create |
| `src/pages/api/light-generator-island-check.ts` | Create |
| `src/pages/api/light-generator-shadow-preview.ts` | Create |
| `src/components/LightGeneratorOrderForm.tsx` | Create |
| `src/components/LightGeneratorCasingCanvas.tsx` | Create — canvas configurator, di-port dari light-generator |
| `src/i18n/id.json` | Modify — tambah strings light generator |
| `src/i18n/en.json` | Modify — tambah strings light generator |

## Out of Scope

- Sanity Studio schema (dikerjakan di 3dpb-ops)
- Payment flow
- STL generation
- Notifikasi (dikerjakan di 3dpb-ops)
- Cloudflare Turnstile CAPTCHA (bisa ditambah nanti)
- Halaman order tracking customer (spec terpisah) — membaca `status` + `statusNote` dari Sanity by orderId
