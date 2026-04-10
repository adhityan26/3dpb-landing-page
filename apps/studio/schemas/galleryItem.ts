import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'galleryItem',
  title: 'Gallery Item',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'internationalizedArrayString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          validation: (Rule) => Rule.required(),
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      type: 'string',
      options: {
        list: [
          { title: 'Custom', value: 'custom' },
          { title: 'Cosplay', value: 'cosplay' },
          { title: 'Print Service', value: 'print-service' },
          { title: 'Showcase', value: 'showcase' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'caption', type: 'internationalizedArrayText' }),
    defineField({ name: 'order', type: 'number', initialValue: 0 }),
  ],
  orderings: [
    {
      title: 'Display order',
      name: 'orderAsc',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'title.0.value', media: 'image', category: 'category' },
    prepare({ title, media, category }) {
      return { title: title ?? 'Untitled', subtitle: category, media }
    },
  },
})
