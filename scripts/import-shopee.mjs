#!/usr/bin/env node
/**
 * Bulk import Shopee products into Sanity.
 *
 * Usage:
 *   SANITY_WRITE_TOKEN=sk... node scripts/import-shopee.mjs
 *
 * What it does:
 * 1. Reads merged Shopee export from /tmp/shopee_products_full.json
 * 2. Groups duplicate listings into one base product
 * 3. Downloads cover photo from Shopee CDN → uploads to Sanity as asset
 * 4. Creates product documents with marketplaceListings[]
 */

import { createClient } from '@sanity/client'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

const token = process.env.SANITY_WRITE_TOKEN
if (!token) {
  console.error('Set SANITY_WRITE_TOKEN env var')
  process.exit(1)
}

const client = createClient({
  projectId: 'narxcnnu',
  dataset: 'production',
  apiVersion: '2024-10-01',
  token,
  useCdn: false,
})

// ── Load data ───────────────────────────────────────────────────────────
const raw = JSON.parse(readFileSync('/tmp/shopee_products_full.json', 'utf8'))
console.log(`Loaded ${raw.length} Shopee listings`)

// ── Auto-categorize ─────────────────────────────────────────────────────
function autoCategory(name) {
  const n = name.toLowerCase()
  if (/mask|topeng|faceshell|helm|vysor/.test(n)) return 'cosplay'
  if (/keychain|gantungan kunci|gatungan kunci/.test(n)) return 'keychain'
  if (/fidget|clicker|spinner|gonggi/.test(n)) return 'fidget'
  if (/charm|jibbitz|badge|aksesoris|sendal|sandal|tempelan|pin\b|dudukan/.test(n)) return 'accessory'
  if (/earring|hairpin|jepit|belt|ikat/.test(n)) return 'accessory'
  if (/sword|holder|deadpool belt/.test(n)) return 'cosplay'
  if (/custom/.test(n)) return 'other'
  return 'other'
}

// ── Group duplicates ────────────────────────────────────────────────────
// Known groups: merge SATUAN/Sepasang, Colorful/Pola into one product
const mergeRules = [
  { match: /Jibbitz Swoosh Multicolor Side Logo/i, baseName: 'Crocs Charm Jibbitz Swoosh Multicolor Side Logo' },
  { match: /Jibbitz Swoosh Side Logo (\(SATUAN\)|\(Sepasang\))/i, baseName: 'Crocs Charm Jibbitz Swoosh Side Logo' },
  { match: /Badge \/ Charm Unik Lucu (Colorful|Pola)/i, baseName: 'Aksesoris Sandal Badge / Charm Unik Lucu' },
]

const groups = new Map()
for (const item of raw) {
  let groupKey = item.id
  let baseName = item.name

  for (const rule of mergeRules) {
    if (rule.match.test(item.name)) {
      groupKey = `group:${rule.baseName}`
      baseName = rule.baseName
      break
    }
  }

  if (!groups.has(groupKey)) {
    groups.set(groupKey, {
      baseName,
      category: autoCategory(item.name),
      photos: item.photos,
      listings: [],
    })
  }
  groups.get(groupKey).listings.push({
    platform: 'shopee',
    listingName: item.name,
    url: item.shopee_url,
    price: item.price ? Number(item.price) : undefined,
  })
  // Use photos from the listing with most photos
  const g = groups.get(groupKey)
  if (item.photos.length > g.photos.length) {
    g.photos = item.photos
  }
}

console.log(`Grouped into ${groups.size} base products`)

// ── Helpers ─────────────────────────────────────────────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96)
}

async function uploadImage(url, filename) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`)
  const buffer = Buffer.from(await resp.arrayBuffer())
  const contentType = resp.headers.get('content-type') || 'image/jpeg'
  const asset = await client.assets.upload('image', buffer, {
    filename,
    contentType,
  })
  return asset._id
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ── Import ──────────────────────────────────────────────────────────────
let created = 0
let failed = 0
const total = groups.size

for (const [key, group] of groups) {
  const idx = created + failed + 1
  const shortName = group.baseName.slice(0, 50)
  process.stdout.write(`[${idx}/${total}] ${shortName}...`)

  try {
    // Upload first photo (cover) — max 5 photos per product
    const photoRefs = []
    const photosToUpload = group.photos.slice(0, 5)
    for (let i = 0; i < photosToUpload.length; i++) {
      const url = photosToUpload[i]
      if (!url || !url.startsWith('http')) continue
      try {
        const assetId = await uploadImage(url, `${slugify(group.baseName)}-${i}.jpg`)
        photoRefs.push({
          _type: 'image',
          _key: randomUUID().slice(0, 8),
          asset: { _type: 'reference', _ref: assetId },
          alt: group.baseName,
        })
        // Rate limit Sanity uploads
        await sleep(300)
      } catch (err) {
        console.warn(` [photo ${i} failed: ${err.message}]`)
      }
    }

    if (photoRefs.length === 0) {
      console.log(' SKIP (no photos)')
      failed++
      continue
    }

    const doc = {
      _type: 'product',
      title: [
        { _type: 'internationalizedArrayStringValue', _key: 'id', value: group.baseName },
      ],
      slug: { _type: 'slug', current: slugify(group.baseName) },
      category: group.category,
      photos: photoRefs,
      marketplaceListings: group.listings.map((l) => ({
        _type: 'listing',
        _key: randomUUID().slice(0, 8),
        platform: l.platform,
        listingName: l.listingName,
        url: l.url,
        price: l.price || undefined,
      })),
      featured: true,
      order: idx,
    }

    await client.create(doc)
    created++
    console.log(` ✓ (${photoRefs.length} photos, ${group.listings.length} listings)`)
  } catch (err) {
    failed++
    console.log(` ✗ ${err.message}`)
  }

  // Rate limit
  await sleep(200)
}

console.log(`\nDone! Created: ${created}, Failed: ${failed}`)
