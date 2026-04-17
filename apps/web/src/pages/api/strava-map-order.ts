import type { APIContext } from 'astro'
import { createClient } from '@sanity/client'
import { generateMap2ModelProject } from '~/lib/map2model'

export const prerender = false

const WA_REGEX = /^(\+?62|0)[0-9]{8,13}$/
const STRAVA_REGEX = /^https:\/\/(www\.)?strava\.com\//
const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/
const VALID_SIZES = ['small', 'medium', 'large'] as const
const VALID_SHAPES = ['square', 'rectangle', 'circle', 'hexagon'] as const
const VALID_LAYERS = ['road', 'water', 'green', 'building'] as const

type Size = (typeof VALID_SIZES)[number]
type Shape = (typeof VALID_SHAPES)[number]
type Layer = (typeof VALID_LAYERS)[number]

const DEFAULT_COLORS = {
  gpxPath: '#FC4C02',
  road: '#D4C5A9',
  water: '#5BA4CF',
  green: '#8DB87A',
  building: '#B8A898',
}

interface RequestBody {
  name?: unknown
  whatsapp?: unknown
  stravaUrl?: unknown
  size?: unknown
  shape?: unknown
  colors?: unknown
  enabledLayers?: unknown
  gpxGeoJson?: unknown
  areaPolygon?: unknown
  notes?: unknown
}

function getEnv(ctx: APIContext, key: string): string | undefined {
  const runtimeEnv = (ctx.locals as { runtime?: { env?: Record<string, string | undefined> } })
    .runtime?.env
  return (
    runtimeEnv?.[key] ??
    (typeof process !== 'undefined' ? process.env[key] : undefined) ??
    (import.meta.env as Record<string, string | undefined>)[key]
  )
}

function sanitizeHex(value: unknown, fallback: string): string {
  if (typeof value === 'string' && HEX_REGEX.test(value.trim())) return value.trim().toUpperCase()
  return fallback
}

export async function POST(ctx: APIContext): Promise<Response> {
  let body: RequestBody
  try {
    body = (await ctx.request.json()) as RequestBody
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const whatsapp = typeof body.whatsapp === 'string' ? body.whatsapp.trim() : ''
  const stravaUrl = typeof body.stravaUrl === 'string' ? body.stravaUrl.trim() : ''
  const size = typeof body.size === 'string' ? body.size : ''
  const shape = typeof body.shape === 'string' ? body.shape : 'square'
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 1000) : ''
  const rawColors = typeof body.colors === 'object' && body.colors !== null
    ? body.colors as Record<string, unknown>
    : {}
  const rawLayers = Array.isArray(body.enabledLayers) ? body.enabledLayers : []
  const enabledLayers = rawLayers.filter((l): l is Layer => VALID_LAYERS.includes(l as Layer))
  const gpxGeoJson = typeof body.gpxGeoJson === 'object' && body.gpxGeoJson !== null
    ? body.gpxGeoJson as Record<string, unknown>
    : null
  const areaPolygon = typeof body.areaPolygon === 'object' && body.areaPolygon !== null
    ? body.areaPolygon as Record<string, unknown>
    : null

  if (!name || name.length > 100) return Response.json({ error: 'invalid_name' }, { status: 400 })
  if (!whatsapp || !WA_REGEX.test(whatsapp)) return Response.json({ error: 'invalid_whatsapp' }, { status: 400 })
  if (!stravaUrl || !STRAVA_REGEX.test(stravaUrl)) return Response.json({ error: 'invalid_strava_url' }, { status: 400 })
  if (!VALID_SIZES.includes(size as Size)) return Response.json({ error: 'invalid_size' }, { status: 400 })
  if (!VALID_SHAPES.includes(shape as Shape)) return Response.json({ error: 'invalid_shape' }, { status: 400 })

  const colors = {
    gpxPath: sanitizeHex(rawColors.gpxPath, DEFAULT_COLORS.gpxPath),
    road: sanitizeHex(rawColors.road, DEFAULT_COLORS.road),
    water: sanitizeHex(rawColors.water, DEFAULT_COLORS.water),
    green: sanitizeHex(rawColors.green, DEFAULT_COLORS.green),
    building: sanitizeHex(rawColors.building, DEFAULT_COLORS.building),
  }

  const projectId = getEnv(ctx, 'PUBLIC_SANITY_PROJECT_ID')
  const dataset = getEnv(ctx, 'PUBLIC_SANITY_DATASET') ?? 'production'
  const apiVersion = getEnv(ctx, 'PUBLIC_SANITY_API_VERSION') ?? '2024-10-01'
  const token = getEnv(ctx, 'SANITY_WRITE_TOKEN')

  if (!projectId || !token) return Response.json({ error: 'server_misconfigured' }, { status: 500 })

  const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false })

  const doc: Record<string, unknown> = {
    _type: 'stravaMapOrder',
    name,
    whatsapp,
    stravaUrl,
    size,
    shape,
    colors,
    enabledLayers,
    status: 'new',
    submittedAt: new Date().toISOString(),
  }
  if (notes) doc.notes = notes
  if (gpxGeoJson) doc.gpxGeoJson = JSON.stringify(gpxGeoJson)
  if (areaPolygon) doc.areaPolygon = JSON.stringify(areaPolygon)

  let sanityId: string
  try {
    const created = await client.create(doc as never)
    sanityId = created._id
  } catch (err) {
    console.error('[strava-map-order] sanity create failed', err)
    return Response.json({ error: 'write_failed' }, { status: 500 })
  }

  // Verify the project JSON can be generated (but don't return it to the customer)
  generateMap2ModelProject({
    size: size as Size,
    shape: shape as Shape,
    colors,
    enabledLayers,
    gpxGeoJson: gpxGeoJson ?? undefined,
  })

  return Response.json({ ok: true, id: sanityId }, { status: 200 })
}
