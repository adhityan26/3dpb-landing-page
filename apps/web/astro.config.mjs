import { defineConfig } from 'astro/config'
import cloudflare from '@astrojs/cloudflare'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  site: 'https://3dprintingbandung.my.id',
  // Astro 5: default is static; routes that `export const prerender = false`
  // (e.g. /api/waitlist) are built as Cloudflare Pages Functions automatically.
  output: 'static',
  adapter: cloudflare({
    imageService: 'compile',
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    defaultLocale: 'id',
    locales: ['id', 'en'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
})
