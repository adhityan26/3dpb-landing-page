import type { SchemaTypeDefinition } from 'sanity'
import siteSettings from './siteSettings'
import product from './product'
import galleryItem from './galleryItem'
import silhouetteGenerator from './silhouetteGenerator'
import faceshellCollection from './faceshellCollection'
import testimonial from './testimonial'
import faq from './faq'
import waitlistEntry from './waitlistEntry'
import stravaMapOrder from './stravaMapOrder'

export const schemaTypes: SchemaTypeDefinition[] = [
  siteSettings,
  product,
  galleryItem,
  silhouetteGenerator,
  faceshellCollection,
  testimonial,
  faq,
  waitlistEntry,
  stravaMapOrder,
]
