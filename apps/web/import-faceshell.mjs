#!/usr/bin/env node
/**
 * Bulk-populate faceshellCollection.items[] from a local folder.
 *
 * Usage:
 *   SANITY_WRITE_TOKEN=sk... node import-faceshell.mjs
 *
 * Reads every subfolder of ROOT — if the folder has at least one image file
 * (jpg/jpeg/png/webp) and at least one .stl, uploads the first image and
 * adds an item { title: <folder name>, image: <uploaded asset> }.
 */

import { createClient } from '@sanity/client'
import { randomUUID } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname, basename } from 'node:path'

const ROOT = '/Volumes/3D Model/_sensational_/Face Shell'
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

const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp'])

function listDir(path) {
  return readdirSync(path).filter((n) => !n.startsWith('.') && n !== 'Thumbs.db')
}

function isImage(f) {
  return IMG_EXT.has(extname(f).toLowerCase())
}

function isStl(f) {
  return extname(f).toLowerCase() === '.stl'
}

const folders = listDir(ROOT).filter((name) => {
  const p = join(ROOT, name)
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
})

const valid = []
for (const name of folders) {
  const p = join(ROOT, name)
  const files = listDir(p)
  const imgs = files.filter(isImage)
  const stls = files.filter(isStl)
  if (imgs.length > 0 && stls.length > 0) {
    valid.push({ name, cover: join(p, imgs[0]) })
  }
}

console.log(`Found ${valid.length} valid faceshell folders`)

async function uploadImage(path) {
  const buffer = readFileSync(path)
  const ext = extname(path).toLowerCase()
  const contentType =
    ext === '.png' ? 'image/png' :
    ext === '.webp' ? 'image/webp' :
    'image/jpeg'
  const asset = await client.assets.upload('image', buffer, {
    filename: basename(path),
    contentType,
  })
  return asset._id
}

const items = []
for (let i = 0; i < valid.length; i++) {
  const { name, cover } = valid[i]
  process.stdout.write(`[${i + 1}/${valid.length}] ${name}...`)
  try {
    const assetId = await uploadImage(cover)
    items.push({
      _type: 'collectionItem',
      _key: randomUUID().slice(0, 8),
      image: {
        _type: 'image',
        asset: { _type: 'reference', _ref: assetId },
        alt: `${name} faceshell`,
      },
      title: [
        { _type: 'internationalizedArrayStringValue', _key: 'id', value: name },
      ],
    })
    console.log(' ✓')
  } catch (err) {
    console.log(` ✗ ${err.message}`)
  }
  await new Promise((r) => setTimeout(r, 200))
}

// Upsert the singleton with items[]
console.log(`\nUpserting faceshellCollection with ${items.length} items...`)

const existing = await client.getDocument('faceshellCollection')
const doc = {
  _id: 'faceshellCollection',
  _type: 'faceshellCollection',
  headline: existing?.headline ?? [
    { _type: 'internationalizedArrayStringValue', _key: 'id', value: 'Spiderman Faceshell Collection' },
    { _type: 'internationalizedArrayStringValue', _key: 'en', value: 'Spiderman Faceshell Collection' },
  ],
  description: existing?.description,
  measurementGuide: existing?.measurementGuide,
  externalMeasurementUrl: existing?.externalMeasurementUrl,
  externalMeasurementLabel: existing?.externalMeasurementLabel,
  orderWhatsappMessage: existing?.orderWhatsappMessage,
  items,
}
await client.createOrReplace(doc)

console.log(`Done! ${items.length} items uploaded.`)
