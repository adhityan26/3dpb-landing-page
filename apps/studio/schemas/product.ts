import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'internationalizedArrayString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {
        source: (doc) => {
          const titles = (doc as { title?: Array<{ value?: string }> }).title ?? []
          return titles[0]?.value ?? 'product'
        },
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      type: 'string',
      options: {
        list: [
          { title: 'Keychain', value: 'keychain' },
          { title: 'Fidget', value: 'fidget' },
          { title: 'Toy', value: 'toy' },
          { title: 'Cosplay', value: 'cosplay' },
          { title: 'Accessory', value: 'accessory' },
          { title: 'Other', value: 'other' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'photos',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              type: 'string',
              title: 'Alt text',
              validation: (Rule) => Rule.required(),
            }),
          ],
        },
      ],
      validation: (Rule) => Rule.required().min(1).max(5),
    }),
    defineField({
      name: 'shortDescription',
      type: 'internationalizedArrayText',
    }),
    defineField({
      name: 'marketplaceListings',
      title: 'Marketplace Listings',
      description: 'Links to this product on each marketplace platform.',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'listing',
          fields: [
            defineField({
              name: 'platform',
              type: 'string',
              options: {
                list: [
                  { title: 'Shopee', value: 'shopee' },
                  { title: 'Tokopedia', value: 'tokopedia' },
                  { title: 'TikTok Shop', value: 'tiktokShop' },
                  { title: 'Other', value: 'other' },
                ],
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'listingName',
              type: 'string',
              title: 'Listing name (as shown on marketplace)',
            }),
            defineField({
              name: 'url',
              type: 'url',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'price',
              type: 'number',
              title: 'Price (IDR)',
            }),
          ],
          preview: {
            select: { platform: 'platform', name: 'listingName', price: 'price' },
            prepare: ({ platform, name, price }) => ({
              title: `${(platform ?? '').charAt(0).toUpperCase()}${(platform ?? '').slice(1)}: ${name ?? '(unnamed)'}`,
              subtitle: price ? `Rp${price.toLocaleString('id-ID')}` : '',
            }),
          },
        },
      ],
      validation: (Rule) => Rule.min(1).error('Add at least one marketplace listing'),
    }),
    defineField({
      name: 'featured',
      type: 'boolean',
      initialValue: true,
      description: 'Show on landing page',
    }),
    defineField({
      name: 'order',
      type: 'number',
      initialValue: 0,
    }),
  ],
  orderings: [
    {
      title: 'Display order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'title.0.value', media: 'photos.0', category: 'category' },
    prepare({ title, media, category }) {
      return { title: title ?? 'Untitled', subtitle: category, media }
    },
  },
})
