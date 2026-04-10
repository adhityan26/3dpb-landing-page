import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'silhouetteGenerator',
  title: 'Silhouette Generator',
  type: 'document',
  fields: [
    defineField({
      name: 'headline',
      type: 'internationalizedArrayString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      type: 'internationalizedArrayText',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'devScreenshots',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
          ],
        },
      ],
      validation: (Rule) => Rule.min(1).max(10),
    }),
    defineField({
      name: 'launchStatus',
      type: 'string',
      options: {
        list: [
          { title: 'Coming Soon', value: 'coming-soon' },
          { title: 'Beta', value: 'beta' },
          { title: 'Live', value: 'live' },
        ],
        layout: 'radio',
      },
      initialValue: 'coming-soon',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'estimatedLaunch',
      type: 'string',
      description: 'Free text, e.g. "Q3 2026"',
    }),
  ],
  preview: { prepare: () => ({ title: 'Silhouette Generator' }) },
})
