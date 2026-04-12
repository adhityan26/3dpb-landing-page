# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS build
WORKDIR /app
ARG PUBLIC_SANITY_PROJECT_ID
ARG PUBLIC_SANITY_DATASET=production
ARG PUBLIC_SANITY_API_VERSION=2024-10-01
ENV PUBLIC_SANITY_PROJECT_ID=$PUBLIC_SANITY_PROJECT_ID
ENV PUBLIC_SANITY_DATASET=$PUBLIC_SANITY_DATASET
ENV PUBLIC_SANITY_API_VERSION=$PUBLIC_SANITY_API_VERSION
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

# Minimal runtime package.json — the Node SSR entry.mjs only needs a handful
# of externals that Vite did not bundle. Everything else (astro, vite, babel,
# typescript, @shikijs, lightningcss, etc.) is build-time only.
FROM node:20-alpine AS prod-deps
WORKDIR /app
RUN printf '%s\n' \
  '{' \
  '  "name": "3dpb-web-runtime",' \
  '  "version": "0.0.0",' \
  '  "private": true,' \
  '  "type": "module",' \
  '  "dependencies": {' \
  '    "@sanity/client": "^6.22.1",' \
  '    "@sanity/image-url": "^1.0.2",' \
  '    "astro": "^5.0.0",' \
  '    "embla-carousel": "^8.3.0",' \
  '    "embla-carousel-react": "^8.3.0",' \
  '    "react": "^18.3.1",' \
  '    "react-dom": "^18.3.1",' \
  '    "send": "^0.19.0",' \
  '    "server-destroy": "^1.0.1"' \
  '  }' \
  '}' > package.json \
  && npm install --no-audit --no-fund --omit=optional \
  && npm cache clean --force \
  && rm -rf \
    node_modules/typescript \
    node_modules/vite \
    node_modules/rollup \
    node_modules/@rollup \
    node_modules/esbuild \
    node_modules/@esbuild \
    node_modules/@babel \
    node_modules/@shikijs \
    node_modules/shiki \
    node_modules/prismjs \
    node_modules/csso \
    node_modules/terser \
    node_modules/@astrojs/check \
    node_modules/@astrojs/language-server \
    node_modules/lightningcss* \
    node_modules/@img

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
COPY --from=build /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package.json ./package.json
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
