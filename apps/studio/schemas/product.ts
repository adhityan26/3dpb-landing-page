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
      name: 'marketplaceLinks',
      type: 'object',
      fields: [
        defineField({ name: 'shopee', type: 'url' }),
        defineField({ name: 'tokopedia', type: 'url' }),
        defineField({ name: 'tiktokShop', type: 'url', title: 'TikTok Shop' }),
      ],
      validation: (Rule) =>
        Rule.custom((links: { shopee?: string; tokopedia?: string; tiktokShop?: string } | undefined) => {
          if (!links) return 'Provide at least one marketplace link'
          const any = links.shopee || links.tokopedia || links.tiktokShop
          return any ? true : 'Provide at least one marketplace link'
        }),
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
