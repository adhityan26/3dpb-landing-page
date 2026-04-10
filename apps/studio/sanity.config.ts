import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { internationalizedArray } from 'sanity-plugin-internationalized-array'
import { schemaTypes } from './schemas'
import { structure } from './structure'

export default defineConfig({
  name: 'default',
  title: '3dprintingbandung CMS',

  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',

  plugins: [
    structureTool({ structure }),
    visionTool(),
    internationalizedArray({
      languages: [
        { id: 'id', title: 'Bahasa Indonesia' },
        { id: 'en', title: 'English' },
      ],
      defaultLanguages: ['id'],
      fieldTypes: ['string', 'text'],
    }),
  ],

  schema: {
    types: schemaTypes,
    // Prevent duplicating singletons from the "Create new" action
    templates: (templates) =>
      templates.filter(
        ({ schemaType }) =>
          schemaType !== 'siteSettings' &&
          schemaType !== 'silhouetteGenerator'
      ),
  },

  document: {
    // Hide the "delete" action on singletons
    actions: (input, context) => {
      const singletons = ['siteSettings', 'silhouetteGenerator']
      if (singletons.includes(context.schemaType)) {
        return input.filter(({ action }) => action !== 'delete' && action !== 'duplicate')
      }
      return input
    },
  },
})
