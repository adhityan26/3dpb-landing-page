/**
 * Returns the athlete's 20 most recent activities (with summary polyline).
 * Reads the Strava access token from the httpOnly cookie set by strava-callback.
 */
import type { APIContext } from 'astro'

export const prerender = false

export interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type: string
  start_date_local: string
  distance: number       // meters
  elapsed_time: number   // seconds
  map: { summary_polyline: string }
}

function getToken(ctx: APIContext): string | null {
  const cookie = ctx.request.headers.get('cookie') ?? ''
  const match = /strava_token=([^;]+)/.exec(cookie)
  return match ? decodeURIComponent(match[1]) : null
}

export async function GET(ctx: APIContext): Promise<Response> {
  const token = getToken(ctx)
  if (!token) return Response.json({ error: 'not_authenticated' }, { status: 401 })

  try {
    const res = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=20',
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (res.status === 401) return Response.json({ error: 'token_expired' }, { status: 401 })
    if (!res.ok) throw new Error(`Strava API error: ${res.status}`)

    const activities = (await res.json()) as StravaActivity[]
    // Only return activities that have GPS data
    const filtered = activities.filter((a) => a.map?.summary_polyline)
    return Response.json(filtered)
  } catch (err) {
    console.error('[strava/activities]', err)
    return Response.json({ error: 'fetch_failed' }, { status: 502 })
  }
}
