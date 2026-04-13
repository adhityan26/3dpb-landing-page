import { createClient, type SanityClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import type { SanityImageRef } from './types'

export interface ClientOptions {
  projectId: string
  dataset: string
  apiVersion: string
  token?: string
}

export function createSanityClient(opts: ClientOptions): SanityClient {
  return createClient({
    projectId: opts.projectId,
    dataset: opts.dataset,
    apiVersion: opts.apiVersion,
    token: opts.token,
    useCdn: !opts.token,
    perspective: 'published',
  })
}

export function urlFor(client: SanityClient, image: SanityImageRef) {
  return imageUrlBuilder(client).image(image)
}

export const queries = {
  siteSettings: /* groq */ `*[_type == "siteSettings"][0]{
    brandName,
    tagline,
    logo{..., "alt": alt},
    sections,
    pillars[]{_key, icon, title, body},
    contact{
      whatsapp,
      instagram,
      email,
      address,
      operatingHours
    },
    marketplaceLinks,
    seo{
      defaultTitle,
      defaultDescription,
      ogImage{..., "alt": alt}
    }
  }`,

  featuredProducts: /* groq */ `*[_type == "product" && featured == true] | order(order asc){
    _id,
    title,
    slug,
    category,
    photos[]{..., "alt": alt},
    shortDescription,
    marketplaceListings[]{_key, platform, listingName, url, price},
    featured,
    order
  }`,

  galleryItems: /* groq */ `*[_type == "galleryItem"] | order(order asc){
    _id,
    title,
    image{..., "alt": alt},
    category,
    caption,
    order
  }`,

  allProducts: /* groq */ `*[_type == "product"] | order(order asc){
    _id,
    title,
    slug,
    category,
    photos[]{..., "alt": alt},
    shortDescription,
    marketplaceListings[]{_key, platform, listingName, url, price},
    featured,
    order
  }`,

  silhouetteGenerator: /* groq */ `*[_type == "silhouetteGenerator"][0]{
    headline,
    description,
    devScreenshots[]{..., "alt": alt},
    launchStatus,
    estimatedLaunch
  }`,
} as const

export function clientFromEnv(env: Record<string, string | undefined> = import.meta.env as unknown as Record<string, string | undefined>): SanityClient {
  const projectId = env.PUBLIC_SANITY_PROJECT_ID
  const dataset = env.PUBLIC_SANITY_DATASET ?? 'production'
  const apiVersion = env.PUBLIC_SANITY_API_VERSION ?? '2024-10-01'
  if (!projectId) {
    throw new Error('PUBLIC_SANITY_PROJECT_ID is not set')
  }
  return createSanityClient({ projectId, dataset, apiVersion })
}
