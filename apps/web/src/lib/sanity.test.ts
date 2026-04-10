import { describe, it, expect } from 'vitest'
import { createSanityClient, queries, urlFor } from './sanity'

describe('createSanityClient()', () => {
  it('builds a client with required options', () => {
    const client = createSanityClient({
      projectId: 'abc123',
      dataset: 'production',
      apiVersion: '2024-10-01',
    })
    expect(client.config().projectId).toBe('abc123')
    expect(client.config().dataset).toBe('production')
    expect(client.config().apiVersion).toBe('2024-10-01')
    expect(client.config().useCdn).toBe(true)
  })

  it('disables CDN when a token is provided', () => {
    const client = createSanityClient({
      projectId: 'abc123',
      dataset: 'production',
      apiVersion: '2024-10-01',
      token: 'sk-secret',
    })
    expect(client.config().useCdn).toBe(false)
    expect(client.config().token).toBe('sk-secret')
  })
})

describe('queries', () => {
  it('defines expected query constants as non-empty strings', () => {
    expect(queries.siteSettings).toContain('siteSettings')
    expect(queries.featuredProducts).toContain('product')
    expect(queries.featuredProducts).toContain('featured == true')
    expect(queries.galleryItems).toContain('galleryItem')
    expect(queries.silhouetteGenerator).toContain('silhouetteGenerator')
  })
})

describe('urlFor()', () => {
  it('returns a builder with width/format helpers for a valid ref', () => {
    const client = createSanityClient({
      projectId: 'abc123',
      dataset: 'production',
      apiVersion: '2024-10-01',
    })
    const builder = urlFor(client, {
      _type: 'image',
      asset: { _ref: 'image-abc-100x100-png', _type: 'reference' },
    })
    expect(typeof builder.width).toBe('function')
    expect(typeof builder.url).toBe('function')
  })
})
