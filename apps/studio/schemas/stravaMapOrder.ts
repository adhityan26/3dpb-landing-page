import { defineField, defineType } from 'sanity'

export default defineType({
  name: 'stravaMapOrder',
  title: 'Strava Map Order',
  type: 'document',
  groups: [
    { name: 'order', title: 'Order Info', default: true },
    { name: 'config', title: 'Map Config' },
    { name: 'admin', title: 'Admin' },
  ],
  fields: [
    // ── Order Info ───────────────────────────────────────────
    defineField({ name: 'name', title: 'Name', type: 'string', group: 'order', validation: (R) => R.required() }),
    defineField({ name: 'whatsapp', title: 'WhatsApp Number', type: 'string', group: 'order', validation: (R) => R.required() }),
    defineField({ name: 'stravaUrl', title: 'Strava Activity URL', type: 'url', group: 'order', validation: (R) => R.required() }),
    defineField({ name: 'notes', title: 'Customer Notes', type: 'text', group: 'order' }),
    defineField({ name: 'submittedAt', title: 'Submitted At', type: 'datetime', readOnly: true, group: 'order' }),

    // ── Map Config ───────────────────────────────────────────
    defineField({
      name: 'size', title: 'Size', type: 'string', group: 'config',
      options: {
        list: [
          { title: 'Small — 10 cm', value: 'small' },
          { title: 'Medium — 15 cm', value: 'medium' },
          { title: 'Large — 20 cm', value: 'large' },
        ],
        layout: 'radio',
      },
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'shape', title: 'Shape', type: 'string', group: 'config',
      options: {
        list: [
          { title: 'Square', value: 'square' },
          { title: 'Rectangle (follow route bounds)', value: 'rectangle' },
          { title: 'Circle', value: 'circle' },
          { title: 'Hexagon', value: 'hexagon' },
        ],
        layout: 'radio',
      },
      initialValue: 'square',
    }),
    defineField({
      name: 'enabledLayers', title: 'Enabled Layers', type: 'array', group: 'config',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Road', value: 'road' },
          { title: 'Water', value: 'water' },
          { title: 'Green / Nature', value: 'green' },
          { title: 'Building', value: 'building' },
        ],
      },
    }),
    defineField({
      name: 'colors', title: 'Layer Colors', type: 'object', group: 'config',
      fields: [
        defineField({ name: 'gpxPath', title: 'GPX Path', type: 'string', initialValue: '#FC4C02' }),
        defineField({ name: 'road', title: 'Road', type: 'string', initialValue: '#D4C5A9' }),
        defineField({ name: 'water', title: 'Water', type: 'string', initialValue: '#5BA4CF' }),
        defineField({ name: 'green', title: 'Green / Nature', type: 'string', initialValue: '#8DB87A' }),
        defineField({ name: 'building', title: 'Building', type: 'string', initialValue: '#B8A898' }),
      ],
    }),
    defineField({
      name: 'gpxGeoJson',
      title: 'GPX Route (GeoJSON)',
      type: 'text',
      group: 'config',
      description: 'Stored automatically on submit. Used to regenerate the map2model project file.',
      readOnly: true,
    }),
    defineField({
      name: 'areaPolygon',
      title: 'Print Area Polygon (GeoJSON)',
      type: 'text',
      group: 'config',
      description: 'The exact area the customer drew on the map. Used as areaPolygon in map2model.',
      readOnly: true,
    }),

    // ── Admin ────────────────────────────────────────────────
    defineField({
      name: 'status', title: 'Status', type: 'string', group: 'admin',
      initialValue: 'new',
      options: {
        list: [
          { title: '🆕 New', value: 'new' },
          { title: '🔧 In Progress', value: 'in-progress' },
          { title: '✅ Done', value: 'done' },
          { title: '❌ Cancelled', value: 'cancelled' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'adminNotes', title: 'Admin Notes', type: 'text', group: 'admin',
      description: 'Internal notes — not visible to customer',
    }),
  ],
  orderings: [
    { title: 'Submitted (newest first)', name: 'submittedDesc', by: [{ field: 'submittedAt', direction: 'desc' }] },
  ],
  preview: {
    select: { title: 'name', subtitle: 'whatsapp', size: 'size', status: 'status' },
    prepare: ({ title, subtitle, size, status }) => ({
      title: `${title ?? '(no name)'} — ${size ?? '?'}`,
      subtitle: `${subtitle ?? ''} · ${status ?? 'new'}`,
    }),
  },
})
