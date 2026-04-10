import idStrings from '~/i18n/id.json'
import enStrings from '~/i18n/en.json'

export type Locale = 'id' | 'en'
export const LOCALES: readonly Locale[] = ['id', 'en'] as const
export const DEFAULT_LOCALE: Locale = 'id'

const dictionaries: Record<Locale, unknown> = {
  id: idStrings,
  en: enStrings,
}

/**
 * Look up a translation by dot-path. Returns the key itself on miss
 * so missing strings are visible in the UI without crashing.
 */
export function t(locale: Locale, path: string): string {
  const segments = path.split('.')
  let node: unknown = dictionaries[locale]
  for (const segment of segments) {
    if (typeof node === 'object' && node !== null && segment in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[segment]
    } else {
      return path
    }
  }
  return typeof node === 'string' ? node : path
}

export type LocalizedArrayField<T = string> = Array<{ _key: string; value: T }>

/**
 * Sanity's internationalized-array plugin stores localized strings as
 * [{ _key: 'id', value: '...' }, { _key: 'en', value: '...' }]. Pick the
 * requested locale, fall back to the default locale, then first entry, then empty.
 */
export function pickLocalized<T = string>(
  field: LocalizedArrayField<T> | undefined,
  locale: Locale
): T | '' {
  if (!field || field.length === 0) return ''
  const match = field.find((entry) => entry._key === locale)
  if (match) return match.value
  const fallback = field.find((entry) => entry._key === DEFAULT_LOCALE)
  if (fallback) return fallback.value
  return field[0]?.value ?? ''
}

export function isLocale(value: unknown): value is Locale {
  return value === 'id' || value === 'en'
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'id' ? 'en' : 'id'
}

/** Build a locale-prefixed URL from a path that starts with `/`. */
export function localizedHref(locale: Locale, path: string): string {
  if (path === '/') return `/${locale}/`
  if (path.startsWith('/#')) return `/${locale}/${path.slice(1)}`
  return `/${locale}${path}`
}
