import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'brandName',
      type: 'string',
      validation: (Rule) => Rule.required(),
      initialValue: '3dprintingbandung',
    }),
    defineField({
      name: 'tagline',
      type: 'internationalizedArrayString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'logo',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          validation: (Rule) => Rule.required(),
        }),
      ],
    }),
    defineField({
      name: 'contact',
      type: 'object',
      fields: [
        defineField({
          name: 'whatsapp',
          type: 'string',
          description: 'Full phone number with country code, e.g. +6281234567890',
          validation: (Rule) => Rule.required().regex(/^\+?[0-9]{8,15}$/),
        }),
        defineField({
          name: 'instagram',
          type: 'string',
          description: 'Handle without @',
          validation: (Rule) => Rule.required(),
        }),
        defineField({ name: 'email', type: 'string', validation: (Rule) => Rule.email() }),
        defineField({ name: 'address', type: 'internationalizedArrayText' }),
        defineField({ name: 'operatingHours', type: 'internationalizedArrayString' }),
      ],
    }),
    defineField({
      name: 'marketplaceLinks',
      type: 'object',
      fields: [
        defineField({ name: 'shopee', type: 'url' }),
        defineField({ name: 'tokopedia', type: 'url' }),
        defineField({ name: 'tiktokShop', type: 'url', title: 'TikTok Shop' }),
      ],
    }),
    defineField({
      name: 'seo',
      type: 'object',
      fields: [
        defineField({
          name: 'defaultTitle',
          type: 'internationalizedArrayString',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'defaultDescription',
          type: 'internationalizedArrayText',
          validation: (Rule) => Rule.required(),
        }),
        defineField({
          name: 'ogImage',
          type: 'image',
          fields: [
            defineField({ name: 'alt', type: 'string' }),
          ],
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Site Settings' }) },
})
