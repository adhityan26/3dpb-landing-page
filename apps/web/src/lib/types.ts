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
}
