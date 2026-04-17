import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'faq',
  title: 'FAQ',
  type: 'document',
  fields: [
    defineField({
      name: 'question',
      type: 'internationalizedArrayString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'answer',
      type: 'internationalizedArrayText',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tags',
      type: 'array',
      description: 'Where this FAQ appears. Leave empty for landing page only.',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'General (landing)', value: 'general' },
          { title: 'Faceshell', value: 'faceshell' },
          { title: 'Generator', value: 'generator' },
          { title: 'Shipping', value: 'shipping' },
        ],
      },
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
    select: { title: 'question.0.value', tags: 'tags' },
    prepare: ({ title, tags }) => ({
      title: title ?? '(untitled)',
      subtitle: tags?.length ? tags.join(', ') : 'general',
    }),
  },
})
