export type ProductCategory = 'keychain' | 'fidget' | 'toy' | 'cosplay' | 'other'
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

export interface SiteSettings {
  brandName: string
  tagline: LocalizedField
  logo?: SanityImageRef
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

export interface Product {
  _id: string
  title: LocalizedField
  slug: { current: string }
  category: ProductCategory
  photos: SanityImageRef[]
  shortDescription?: LocalizedField
  marketplaceLinks: MarketplaceLinks
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
