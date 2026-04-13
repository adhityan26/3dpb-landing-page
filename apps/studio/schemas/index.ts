import type { SchemaTypeDefinition } from 'sanity'
import siteSettings from './siteSettings'
import product from './product'
import galleryItem from './galleryItem'
import silhouetteGenerator from './silhouetteGenerator'
import faceshellCollection from './faceshellCollection'
import testimonial from './testimonial'
import waitlistEntry from './waitlistEntry'

export const schemaTypes: SchemaTypeDefinition[] = [
  siteSettings,
  product,
  galleryItem,
  silhouetteGenerator,
  faceshellCollection,
  testimonial,
  waitlistEntry,
]
