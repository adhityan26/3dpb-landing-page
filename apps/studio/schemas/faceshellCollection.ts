import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'faceshellCollection',
  title: 'Faceshell Collection',
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
    }),
    defineField({
      name: 'items',
      title: 'Collection Items',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'collectionItem',
          fields: [
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
              name: 'title',
              type: 'internationalizedArrayString',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'caption',
              type: 'internationalizedArrayText',
            }),
          ],
          preview: {
            select: { title: 'title.0.value', media: 'image' },
            prepare: ({ title, media }) => ({ title: title ?? '(untitled)', media }),
          },
        },
      ],
    }),
    defineField({
      name: 'measurementGuide',
      title: 'Measurement Guide',
      type: 'object',
      options: { collapsible: true },
      fields: [
        defineField({
          name: 'title',
          type: 'internationalizedArrayString',
        }),
        defineField({
          name: 'description',
          type: 'internationalizedArrayText',
          description: 'Explanation of how to measure head for custom faceshell fitting.',
        }),
        defineField({
          name: 'steps',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'measurementStep',
              fields: [
                defineField({
                  name: 'text',
                  type: 'internationalizedArrayText',
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: 'image',
                  type: 'image',
                  options: { hotspot: true },
                  fields: [
                    defineField({ name: 'alt', type: 'string' }),
                  ],
                }),
              ],
              preview: {
                select: { text: 'text.0.value' },
                prepare: ({ text }) => ({ title: text ?? '(step)' }),
              },
            },
          ],
        }),
      ],
    }),
    defineField({
      name: 'orderWhatsappMessage',
      type: 'string',
      title: 'Pre-filled WhatsApp message for ordering',
      description: 'Message that opens when customer clicks "Order via WhatsApp"',
      initialValue: 'Halo, saya tertarik order Spiderman Faceshell custom. Bisa info lebih lanjut?',
    }),
  ],
  preview: { prepare: () => ({ title: 'Faceshell Collection' }) },
})
