/**
 * Operator download endpoint: /api/strava-map-order/{id}.json
 * Reads the order from Sanity and returns a ready-to-load map2model project JSON.
 */
import type { APIContext } from 'astro'
import { createClient } from '@sanity/client'
import { generateMap2ModelProject } from '~/lib/map2model'
import type { LayerName, MapSize, MapShape, LayerColors } from '~/lib/map2model'

export const prerender = false

interface StoredOrder {
  _id: string
  name?: string
  size?: MapSize
  shape?: MapShape
  enabledLayers?: LayerName[]
  colors?: Partial<LayerColors>
  gpxGeoJson?: string
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

export async function GET(ctx: APIContext): Promise<Response> {
  const id = ctx.params.id
  if (!id) return new Response('Not found', { status: 404 })

  const projectId = getEnv(ctx, 'PUBLIC_SANITY_PROJECT_ID')
  const dataset = getEnv(ctx, 'PUBLIC_SANITY_DATASET') ?? 'production'
  const apiVersion = getEnv(ctx, 'PUBLIC_SANITY_API_VERSION') ?? '2024-10-01'

  if (!projectId) return new Response('Server misconfigured', { status: 500 })

  const client = createClient({ projectId, dataset, apiVersion, useCdn: false, perspective: 'published' })

  let order: StoredOrder | null
  try {
    order = await client.fetch<StoredOrder | null>(
      `*[_type == "stravaMapOrder" && _id == $id][0]{ _id, name, size, shape, enabledLayers, colors, gpxGeoJson }`,
      { id }
    )
  } catch (err) {
    console.error('[strava-map-download] sanity fetch failed', err)
    return new Response('Sanity error', { status: 500 })
  }

  if (!order) return new Response('Order not found', { status: 404 })

  const DEFAULT_COLORS: LayerColors = {
    gpxPath: '#FC4C02',
    road: '#D4C5A9',
    water: '#5BA4CF',
    green: '#8DB87A',
    building: '#B8A898',
  }

  let gpxGeoJson: Record<string, unknown> | undefined
  if (order.gpxGeoJson) {
    try { gpxGeoJson = JSON.parse(order.gpxGeoJson) as Record<string, unknown> } catch { /* ignore */ }
  }

  const projectJson = generateMap2ModelProject({
    size: order.size ?? 'medium',
    shape: order.shape ?? 'square',
    colors: { ...DEFAULT_COLORS, ...(order.colors ?? {}) },
    enabledLayers: order.enabledLayers,
    gpxGeoJson,
  })

  const safeName = (order.name ?? 'order').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const filename = `map2model-${safeName}-${id.slice(-6)}.json`

  return new Response(JSON.stringify(projectJson, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
