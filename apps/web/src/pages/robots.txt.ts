import type { APIRoute } from 'astro'

export const prerender = true

export const GET: APIRoute = () => {
  const site = import.meta.env.PUBLIC_SITE_URL ?? 'https://3dprintingbandung.my.id'
  const body = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${site}/sitemap.xml

# AI crawlers context
# See https://llmstxt.org
User-agent: GPTBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: ClaudeBot
Allow: /
`
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}
