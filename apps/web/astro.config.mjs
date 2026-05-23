import { defineConfig } from 'astro/config'
import node from '@astrojs/node'
import cloudflare from '@astrojs/cloudflare'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

const adapter =
  process.env.DEPLOY_TARGET === 'cloudflare'
    ? cloudflare()
    : node({ mode: 'standalone' })

export default defineConfig({
  site: 'https://3dprintingbandung.my.id',
  output: 'static',
  adapter,
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
