import type { APIContext } from 'astro'
import { createClient } from '@sanity/client'

export const prerender = false

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

interface RequestBody {
  email?: unknown
  name?: unknown
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

export async function POST(ctx: APIContext): Promise<Response> {
  let body: RequestBody
  try {
    body = (await ctx.request.json()) as RequestBody
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''

  if (!email || !EMAIL_REGEX.test(email) || email.length > 254) {
    return Response.json({ error: 'invalid_email' }, { status: 400 })
  }

  const projectId = getEnv(ctx, 'PUBLIC_SANITY_PROJECT_ID')
  const dataset = getEnv(ctx, 'PUBLIC_SANITY_DATASET') ?? 'production'
  const apiVersion = getEnv(ctx, 'PUBLIC_SANITY_API_VERSION') ?? '2024-10-01'
  const token = getEnv(ctx, 'SANITY_WRITE_TOKEN')

  if (!projectId || !token) {
    return Response.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    token,
    useCdn: false,
  })

  const doc: Record<string, unknown> = {
    _type: 'waitlistEntry',
    email,
    source: 'silhouette-generator',
    submittedAt: new Date().toISOString(),
  }
  if (name) doc.name = name

  try {
    await client.create(doc as never)
  } catch (err) {
    console.error('[waitlist] sanity create failed', err)
    return Response.json({ error: 'write_failed' }, { status: 500 })
  }

  return Response.json({ ok: true }, { status: 200 })
}
