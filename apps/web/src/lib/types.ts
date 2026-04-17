export type ProductCategory = 'keychain' | 'fidget' | 'toy' | 'cosplay' | 'accessory' | 'other'
export type GalleryCategory = 'custom' | 'cosplay' | 'print-service' | 'showcase'
export type LaunchStatus = 'coming-soon' | 'beta' | 'live'

export type LocalizedField<T = string> = Array<{ _key: string; value: T }>

export interface SanityImageRef {
  _type: 'image'
  asset: { _ref: string; _type: 'reference' }
  alt?: string
  hotspot?: { x: number; y: number; height: number; width: number }
}

export interface MarketplaceLinks {
  shopee?: string
  tokopedia?: string
  tiktokShop?: string
}

export interface Pillar {
  _key?: string
  icon: string
  title: LocalizedField
  body: LocalizedField
}

export interface SectionCopy {
  heroCtaMarketplace?: LocalizedField
  heroCtaGenerator?: LocalizedField
  productsTitle?: LocalizedField
  galleryTitle?: LocalizedField
  marketplaceTitle?: LocalizedField
  marketplaceSubtitle?: LocalizedField
}

export interface SiteSettings {
  brandName: string
  tagline: LocalizedField
  logo?: SanityImageRef
  sections?: SectionCopy
  pillars?: Pillar[]
  contact: {
    whatsapp: string
    instagram: string
    email?: string
    address?: LocalizedField
    operatingHours?: LocalizedField
  }
  marketplaceLinks: MarketplaceLinks
  seo: {
    defaultTitle: LocalizedField
    defaultDescription: LocalizedField
    ogImage?: SanityImageRef
  }
}

export interface MarketplaceListing {
  _key?: string
  platform: 'shopee' | 'tokopedia' | 'tiktokShop' | 'other'
  listingName?: string
  url: string
  price?: number
}

export interface Product {
  _id: string
  title: LocalizedField
  slug: { current: string }
  category: ProductCategory
  photos: SanityImageRef[]
  shortDescription?: LocalizedField
  marketplaceListings?: MarketplaceListing[]
  featured: boolean
  order: number
}

export interface GalleryItem {
  _id: string
  title: LocalizedField
  image: SanityImageRef
  category: GalleryCategory
  caption?: LocalizedField
  order: number
}

export interface SilhouetteGenerator {
  headline: LocalizedField
  description: LocalizedField
  devScreenshots: SanityImageRef[]
  launchStatus: LaunchStatus
  estimatedLaunch?: string
  orderUrl?: string
  orderLabel?: LocalizedField
}

export interface FaceshellCollectionItem {
  _key?: string
  image: SanityImageRef
  title: LocalizedField
  caption?: LocalizedField
}

export interface MeasurementStep {
  _key?: string
  text: LocalizedField
  image?: SanityImageRef
}

export interface FaceshellCollection {
  headline: LocalizedField
  description?: LocalizedField
  items?: FaceshellCollectionItem[]
  measurementGuide?: {
    title?: LocalizedField
    description?: LocalizedField
    steps?: MeasurementStep[]
  }
  externalMeasurementUrl?: string
  externalMeasurementLabel?: LocalizedField
  orderWhatsappMessage?: string
}

export interface Testimonial {
  _id: string
  name: string
  text: string
  image?: SanityImageRef
  order: number
}

export type FaqTag = 'general' | 'faceshell' | 'generator' | 'shipping'

export interface FAQ {
  _id: string
  question: LocalizedField
  answer: LocalizedField
  tags: FaqTag[]
  order: number
}
