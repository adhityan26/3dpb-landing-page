import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'waitlistEntry',
  title: 'Waitlist Entry',
  type: 'document',
  fields: [
    defineField({
      name: 'email',
      type: 'string',
      validation: (Rule) =>
        Rule.required()
          .email()
          .max(254),
    }),
    defineField({ name: 'name', type: 'string' }),
    defineField({
      name: 'submittedAt',
      type: 'datetime',
      readOnly: true,
    }),
    defineField({
      name: 'source',
      type: 'string',
      initialValue: 'silhouette-generator',
      readOnly: true,
    }),
    defineField({
      name: 'notes',
      type: 'text',
      description: 'Internal notes (admin only)',
    }),
  ],
  orderings: [
    {
      title: 'Submitted (newest first)',
      name: 'submittedDesc',
      by: [{ field: 'submittedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'email', subtitle: 'submittedAt' },
  },
})
