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
      name: 'sections',
      title: 'Section Copy',
      description: 'Headings, subtitles, and CTA labels for landing sections.',
      type: 'object',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: 'heroCtaMarketplace',
          title: 'Hero — Marketplace button label',
          type: 'internationalizedArrayString',
        }),
        defineField({
          name: 'heroCtaGenerator',
          title: 'Hero — Generator button label',
          type: 'internationalizedArrayString',
        }),
        defineField({
          name: 'productsTitle',
          title: 'Products section — heading',
          type: 'internationalizedArrayString',
        }),
        defineField({
          name: 'galleryTitle',
          title: 'Gallery section — heading',
          type: 'internationalizedArrayString',
        }),
        defineField({
          name: 'marketplaceTitle',
          title: 'Marketplace section — heading',
          type: 'internationalizedArrayString',
        }),
        defineField({
          name: 'marketplaceSubtitle',
          title: 'Marketplace section — subtitle',
          type: 'internationalizedArrayString',
        }),
      ],
    }),
    defineField({
      name: 'pillars',
      title: 'What We Offer (Pillars)',
      type: 'array',
      description: 'Cards shown on the landing under "Apa yang Kami Tawarkan". Drag to reorder.',
      of: [
        {
          type: 'object',
          name: 'pillar',
          fields: [
            defineField({
              name: 'icon',
              type: 'string',
              description: 'Emoji, e.g. 📦 🎨 🛠️ 🎭',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'title',
              type: 'internationalizedArrayString',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'body',
              type: 'internationalizedArrayText',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: { icon: 'icon', title: 'title.0.value', subtitle: 'body.0.value' },
            prepare: ({ icon, title, subtitle }) => ({
              title: `${icon ?? '•'} ${title ?? '(untitled)'}`,
              subtitle,
            }),
          },
        },
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
