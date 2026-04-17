/**
 * Returns the full GPS stream (latlng) for a specific Strava activity.
 * Much more detailed than the summary_polyline — typically thousands of points.
 */
import type { APIContext } from 'astro'

export const prerender = false

function getToken(ctx: APIContext): string | null {
  const cookie = ctx.request.headers.get('cookie') ?? ''
  const match = /strava_token=([^;]+)/.exec(cookie)
  return match ? decodeURIComponent(match[1]) : null
}

export async function GET(ctx: APIContext): Promise<Response> {
  const id = ctx.params.id
  if (!id || !/^\d+$/.test(id)) return Response.json({ error: 'invalid_id' }, { status: 400 })

  const token = getToken(ctx)
  if (!token) return Response.json({ error: 'not_authenticated' }, { status: 401 })

  try {
    const res = await fetch(
      `https://www.strava.com/api/v3/activities/${id}/streams?keys=latlng&key_by_type=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (res.status === 401) return Response.json({ error: 'token_expired' }, { status: 401 })
    if (!res.ok) throw new Error(`Strava API error: ${res.status}`)

    const streams = (await res.json()) as { latlng?: { data: [number, number][] } }
    const coordinates = streams.latlng?.data ?? []
    if (!coordinates.length) return Response.json({ error: 'no_gps_data' }, { status: 422 })

    return Response.json({ coordinates })
  } catch (err) {
    console.error('[strava/activity]', err)
    return Response.json({ error: 'fetch_failed' }, { status: 502 })
  }
}
