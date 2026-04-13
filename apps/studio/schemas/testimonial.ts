import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'testimonial',
  title: 'Testimonial',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'text',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      type: 'image',
      description: 'Optional — screenshot WA chat, foto produk in hand, etc.',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', type: 'string' }),
      ],
    }),
    defineField({
      name: 'order',
      type: 'number',
      initialValue: 0,
    }),
  ],
  orderings: [
    { title: 'Display order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'name', subtitle: 'text', media: 'image' },
    prepare: ({ title, subtitle, media }) => ({
      title: title ?? '(unnamed)',
      subtitle: subtitle ? subtitle.slice(0, 80) : '',
      media,
    }),
  },
})
