import type { SchemaTypeDefinition } from 'sanity'
import siteSettings from './siteSettings'
import product from './product'
import galleryItem from './galleryItem'
import silhouetteGenerator from './silhouetteGenerator'
import waitlistEntry from './waitlistEntry'

export const schemaTypes: SchemaTypeDefinition[] = [
  siteSettings,
  product,
  galleryItem,
  silhouetteGenerator,
  waitlistEntry,
]
