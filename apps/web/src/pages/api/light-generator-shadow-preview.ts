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
