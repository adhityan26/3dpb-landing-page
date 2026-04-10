import type { APIRoute } from 'astro'

export const prerender = true

export const GET: APIRoute = () => {
  const site = import.meta.env.PUBLIC_SITE_URL ?? 'https://3dprintingbandung.my.id'
  const urls = [
    { loc: `${site}/id/`, alternates: [['id', `${site}/id/`], ['en', `${site}/en/`]] },
    { loc: `${site}/en/`, alternates: [['id', `${site}/id/`], ['en', `${site}/en/`]] },
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
${u.alternates
  .map(([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`)
  .join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${site}/id/"/>
  </url>`
  )
  .join('\n')}
</urlset>`
  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  })
}
