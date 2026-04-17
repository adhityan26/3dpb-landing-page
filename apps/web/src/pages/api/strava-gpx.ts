/**
 * Server-side proxy: fetch a public Strava activity page and extract the
 * encoded polyline from the embedded Next.js page props.
 *
 * Returns { coordinates: [lat, lng][] } on success.
 * Returns { error: string } on failure — UI falls back to GPX file upload.
 */
import type { APIContext } from 'astro'
import { decodePolyline } from '~/lib/polyline'

export const prerender = false

const ACTIVITY_ID_RE = /strava\.com\/activities\/(\d+)/

export async function GET(ctx: APIContext): Promise<Response> {
  const url = ctx.url.searchParams.get('url') ?? ''
  const match = ACTIVITY_ID_RE.exec(url)
  if (!match) {
    return Response.json({ error: 'invalid_url' }, { status: 400 })
  }
  const activityId = match[1]

  let html: string
  try {
    const res = await fetch(`https://www.strava.com/activities/${activityId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; 3dprintingbandung/1.0)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      return Response.json({ error: 'strava_fetch_failed', status: res.status }, { status: 502 })
    }
    html = await res.text()
  } catch {
    return Response.json({ error: 'strava_unreachable' }, { status: 502 })
  }

  // Try to extract polyline from __NEXT_DATA__ (Strava's Next.js page props)
  const nextDataMatch = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(html)
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]) as Record<string, unknown>
      const polyline = extractPolyline(nextData)
      if (polyline) {
        const coordinates = decodePolyline(polyline)
        if (coordinates.length > 1) {
          return Response.json({ coordinates })
        }
      }
    } catch {
      // fall through to other strategies
    }
  }

  // Try looking for a bare polyline in a script tag (older Strava structure)
  const scriptPolylineMatch = /"polyline"\s*:\s*"([^"]+)"/.exec(html)
  if (scriptPolylineMatch) {
    try {
      const polyline = JSON.parse(`"${scriptPolylineMatch[1]}"`) as string
      const coordinates = decodePolyline(polyline)
      if (coordinates.length > 1) {
        return Response.json({ coordinates })
      }
    } catch {
      // fall through
    }
  }

  return Response.json({ error: 'polyline_not_found' }, { status: 422 })
}

function extractPolyline(obj: unknown): string | null {
  if (typeof obj !== 'object' || obj === null) return null
  if ('polyline' in obj && typeof (obj as Record<string, unknown>).polyline === 'string') {
    return (obj as Record<string, string>).polyline
  }
  for (const val of Object.values(obj as Record<string, unknown>)) {
    const found = extractPolyline(val)
    if (found) return found
  }
  return null
}
