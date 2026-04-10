import { useCallback, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Lightbox from './Lightbox'

export interface ProductCardProps {
  title: string
  category: string
  shortDescription: string
  photos: Array<{ src: string; alt: string }>
  marketplaceLinks: {
    shopee?: string
    tokopedia?: string
    tiktokShop?: string
  }
}

export default function ProductCard({
  title,
  category,
  shortDescription,
  photos,
  marketplaceLinks,
}: ProductCardProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' })
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  const hasAnyLink = Boolean(marketplaceLinks.shopee || marketplaceLinks.tokopedia || marketplaceLinks.tiktokShop)

  return (
    <article className="overflow-hidden rounded-2xl border border-[color:var(--color-ink-100)] bg-white shadow-sm">
      <div className="relative">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {photos.map((photo, i) => (
              <button
                key={i}
                type="button"
                className="relative min-w-full shrink-0"
                onClick={() => setLightboxIndex(i)}
                aria-label={`Open photo ${i + 1} of ${photos.length}`}
              >
                <img
                  src={photo.src}
                  alt={photo.alt}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={scrollPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={scrollNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"
            >
              ›
            </button>
          </>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-base font-display font-semibold">{title}</h3>
        <p className="mt-0.5 text-xs uppercase tracking-wide text-[color:var(--color-ink-500)]">{category}</p>
        {shortDescription && <p className="mt-2 text-sm text-[color:var(--color-ink-500)]">{shortDescription}</p>}
        {hasAnyLink && (
          <div className="mt-3 flex flex-wrap gap-2">
            {marketplaceLinks.shopee && (
              <a
                href={marketplaceLinks.shopee}
                target="_blank"
                rel="noopener"
                className="rounded-full bg-[#ee4d2d] px-3 py-1 text-xs font-medium text-white hover:opacity-90"
              >
                Shopee
              </a>
            )}
            {marketplaceLinks.tokopedia && (
              <a
                href={marketplaceLinks.tokopedia}
                target="_blank"
                rel="noopener"
                className="rounded-full bg-[#03ac0e] px-3 py-1 text-xs font-medium text-white hover:opacity-90"
              >
                Tokopedia
              </a>
            )}
            {marketplaceLinks.tiktokShop && (
              <a
                href={marketplaceLinks.tiktokShop}
                target="_blank"
                rel="noopener"
                className="rounded-full bg-[#000] px-3 py-1 text-xs font-medium text-white hover:opacity-90"
              >
                TikTok Shop
              </a>
            )}
          </div>
        )}
      </div>
      {lightboxIndex !== null && (
        <Lightbox
          images={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length))}
          onNext={() => setLightboxIndex((i) => (i === null ? null : (i + 1) % photos.length))}
        />
      )}
    </article>
  )
}
