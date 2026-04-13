import type { APIRoute } from 'astro'

export const prerender = true

export const GET: APIRoute = () => {
  const site = import.meta.env.PUBLIC_SITE_URL ?? 'https://3dprintingbandung.my.id'

  const pages = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/products', priority: '0.9', changefreq: 'daily' },
  ]

  const urls = pages.flatMap((page) => [
    {
      loc: `${site}/id${page.path}`,
      alternates: [
        ['id', `${site}/id${page.path}`],
        ['en', `${site}/en${page.path}`],
      ],
      priority: page.priority,
      changefreq: page.changefreq,
    },
    {
      loc: `${site}/en${page.path}`,
      alternates: [
        ['id', `${site}/id${page.path}`],
        ['en', `${site}/en${page.path}`],
      ],
      priority: page.priority,
      changefreq: page.changefreq,
    },
  ])

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
${u.alternates
  .map(([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`)
  .join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${site}/id${u.loc.includes('/products') ? '/products' : '/'}"/>
  </url>`
  )
  .join('\n')}
</urlset>`
  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  })
}
