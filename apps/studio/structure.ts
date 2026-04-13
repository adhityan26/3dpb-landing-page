import type { StructureResolver } from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Site Settings')
        .id('siteSettings')
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId('siteSettings')
        ),
      S.listItem()
        .title('Silhouette Generator')
        .id('silhouetteGenerator')
        .child(
          S.document()
            .schemaType('silhouetteGenerator')
            .documentId('silhouetteGenerator')
        ),
      S.listItem()
        .title('Faceshell Collection')
        .id('faceshellCollection')
        .child(
          S.document()
            .schemaType('faceshellCollection')
            .documentId('faceshellCollection')
        ),
      S.divider(),
      S.documentTypeListItem('product').title('Products'),
      S.documentTypeListItem('galleryItem').title('Gallery'),
      S.documentTypeListItem('testimonial').title('Testimonials'),
      S.divider(),
      S.documentTypeListItem('waitlistEntry').title('Waitlist Entries'),
    ])
