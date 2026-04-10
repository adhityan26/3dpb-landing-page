import { describe, it, expect } from 'vitest'
import { t, pickLocalized, isLocale, otherLocale, localizedHref } from './i18n'

describe('t()', () => {
  it('returns ID translation by key path', () => {
    expect(t('id', 'nav.products')).toBe('Produk')
  })

  it('returns EN translation by key path', () => {
    expect(t('en', 'nav.products')).toBe('Products')
  })

  it('returns the key itself if the path is missing', () => {
    expect(t('id', 'nope.not.here')).toBe('nope.not.here')
  })

  it('resolves deeply nested keys', () => {
    expect(t('id', 'pillars.ready.title')).toBe('Produk Siap Kirim')
    expect(t('en', 'pillars.ready.title')).toBe('Ready-to-Ship Products')
  })

  it('resolves product category labels', () => {
    expect(t('id', 'products.categories.keychain')).toBe('Keychain')
    expect(t('en', 'products.categories.toy')).toBe('Toy')
  })
})

describe('pickLocalized()', () => {
  it('returns the matching locale value', () => {
    const field = [
      { _key: 'id', value: 'Halo' },
      { _key: 'en', value: 'Hello' },
    ]
    expect(pickLocalized(field, 'id')).toBe('Halo')
    expect(pickLocalized(field, 'en')).toBe('Hello')
  })

  it('falls back to ID when the requested locale is missing', () => {
    const field = [{ _key: 'id', value: 'Halo' }]
    expect(pickLocalized(field, 'en')).toBe('Halo')
  })

  it('returns empty string for undefined or empty array', () => {
    expect(pickLocalized(undefined, 'id')).toBe('')
    expect(pickLocalized([], 'id')).toBe('')
  })

  it('returns the first entry if neither requested nor default is present', () => {
    const field = [{ _key: 'fr', value: 'Bonjour' }]
    expect(pickLocalized(field, 'id')).toBe('Bonjour')
  })
})

describe('isLocale()', () => {
  it('accepts id and en', () => {
    expect(isLocale('id')).toBe(true)
    expect(isLocale('en')).toBe(true)
  })
  it('rejects other values', () => {
    expect(isLocale('fr')).toBe(false)
    expect(isLocale(undefined)).toBe(false)
    expect(isLocale(null)).toBe(false)
    expect(isLocale(42)).toBe(false)
  })
})

describe('otherLocale()', () => {
  it('flips id ↔ en', () => {
    expect(otherLocale('id')).toBe('en')
    expect(otherLocale('en')).toBe('id')
  })
})

describe('localizedHref()', () => {
  it('builds prefixed URLs for the root path', () => {
    expect(localizedHref('id', '/')).toBe('/id/')
    expect(localizedHref('en', '/')).toBe('/en/')
  })

  it('handles hash-only anchors', () => {
    expect(localizedHref('en', '/#products')).toBe('/en/#products')
    expect(localizedHref('id', '/#gallery')).toBe('/id/#gallery')
  })

  it('prefixes regular paths', () => {
    expect(localizedHref('en', '/about')).toBe('/en/about')
  })
})
