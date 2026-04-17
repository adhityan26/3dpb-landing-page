/**
 * Strava OAuth callback.
 * Strava redirects here with ?code=XXX&state=LOCALE after user authorization.
 * We exchange the code for an access token, store it in an httpOnly cookie,
 * then redirect back to the strava-map page.
 */
import type { APIContext } from 'astro'

export const prerender = false

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete: { id: number; firstname: string; lastname: string }
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
  const code = ctx.url.searchParams.get('code')
  const state = ctx.url.searchParams.get('state') ?? 'id' // locale passed as state
  const error = ctx.url.searchParams.get('error')

  const redirectBase = `/${state}/strava-map`
  // Behind a reverse proxy ctx.url.origin is localhost — use SITE_URL env var instead
  const origin = getEnv(ctx, 'SITE_URL') ?? ctx.url.origin

  if (error || !code) {
    return Response.redirect(new URL(`${redirectBase}?strava_error=denied`, origin))
  }

  const clientId = getEnv(ctx, 'STRAVA_CLIENT_ID')
  const clientSecret = getEnv(ctx, 'STRAVA_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    return Response.redirect(new URL(`${redirectBase}?strava_error=misconfigured`, ctx.url.origin))
  }

  let tokenData: TokenResponse
  try {
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    })
    if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`)
    tokenData = (await res.json()) as TokenResponse
  } catch (err) {
    console.error('[strava-callback]', err)
    return Response.redirect(new URL(`${redirectBase}?strava_error=token_exchange`, ctx.url.origin))
  }

  // Store token in httpOnly cookie — expires when Strava token expires
  const maxAge = tokenData.expires_at - Math.floor(Date.now() / 1000)
  const cookieValue = encodeURIComponent(tokenData.access_token)
  const isSecure = ctx.url.protocol === 'https:'

  return new Response(null, {
    status: 302,
    headers: {
      Location: new URL(`${redirectBase}?strava_connected=1`, origin).toString(),
      'Set-Cookie': `strava_token=${cookieValue}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`,
    },
  })
}
