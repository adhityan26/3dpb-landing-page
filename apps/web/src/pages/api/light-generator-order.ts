import type { APIContext } from 'astro'
import { createClient } from '@sanity/client'
import { isLGSize, isLGShape, ALLOWED_MIME_TYPES, MAX_FILE_BYTES } from '~/lib/light-generator-types'
import type { LGConfig } from '~/lib/light-generator-types'

export const prerender = false

function getEnv(ctx: APIContext, key: string): string | undefined {
  const runtimeEnv = (ctx.locals as { runtime?: { env?: Record<string, string | undefined> } })
    .runtime?.env
  return (
    runtimeEnv?.[key] ??
    (typeof process !== 'undefined' ? process.env[key] : undefined) ??
    (import.meta.env as Record<string, string | undefined>)[key]
  )
}

function generateOrderId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `LG-${date}-${rand}`
}

function validateFile(file: File | null): string | null {
  if (!file || file.size === 0) return 'missing'
  if (file.size > MAX_FILE_BYTES) return 'too_large'
  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) return 'invalid_type'
  return null
}

export async function POST(ctx: APIContext): Promise<Response> {
  let formData: FormData
  try {
    formData = await ctx.request.formData()
  } catch {
    return Response.json({ error: 'invalid_form_data' }, { status: 400 })
  }

  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const contact = (formData.get('contact') as string | null)?.trim() ?? ''
  const notes = (formData.get('notes') as string | null)?.trim().slice(0, 500) ?? ''
  const size = (formData.get('size') as string | null) ?? ''
  const shape = (formData.get('shape') as string | null) ?? ''
  const shapeRatioW = parseInt((formData.get('shapeRatioW') as string | null) ?? '0', 10)
  const shapeRatioH = parseInt((formData.get('shapeRatioH') as string | null) ?? '0', 10)
  const shadowDiameter = parseFloat((formData.get('shadowDiameter') as string | null) ?? '15')
  const shadowOffsetX = parseFloat((formData.get('shadowOffsetX') as string | null) ?? '0')
  const shadowOffsetY = parseFloat((formData.get('shadowOffsetY') as string | null) ?? '0')
  const supportStems = (formData.get('supportStems') as string | null) === 'true'
  const silhouetteFile = formData.get('silhouette') as File | null
  const floorInsertFile = formData.get('floorInsert') as File | null

  const errors: string[] = []
  if (!name || name.length < 2 || name.length > 100) errors.push('invalid_name')
  if (!contact || contact.length < 5 || contact.length > 100) errors.push('invalid_contact')
  if (!isLGSize(size)) errors.push('invalid_size')
  if (!isLGShape(shape)) errors.push('invalid_shape')
  if (isNaN(shadowDiameter) || shadowDiameter < 10 || shadowDiameter > 200) errors.push('invalid_shadow_diameter')
  if (isNaN(shadowOffsetX) || shadowOffsetX < -500 || shadowOffsetX > 500) errors.push('invalid_shadow_offset_x')
  if (isNaN(shadowOffsetY) || shadowOffsetY < -500 || shadowOffsetY > 500) errors.push('invalid_shadow_offset_y')

  const silhouetteError = validateFile(silhouetteFile)
  if (silhouetteError) errors.push(`invalid_silhouette_${silhouetteError}`)

  if (floorInsertFile && floorInsertFile.size > 0) {
    const floorError = validateFile(floorInsertFile)
    if (floorError) errors.push(`invalid_floor_insert_${floorError}`)
  }

  if (errors.length > 0) {
    return Response.json({ error: 'validation_error', fields: errors }, { status: 400 })
  }

  const projectId = getEnv(ctx, 'PUBLIC_SANITY_PROJECT_ID')
  const dataset = getEnv(ctx, 'PUBLIC_SANITY_DATASET') ?? 'production'
  const apiVersion = getEnv(ctx, 'PUBLIC_SANITY_API_VERSION') ?? '2024-10-01'
  const token = getEnv(ctx, 'SANITY_WRITE_TOKEN')

  if (!projectId || !token) {
    return Response.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false })

  try {
    const silhouetteAsset = await client.assets.upload('image', silhouetteFile!, {
      filename: silhouetteFile!.name,
    })

    let floorInsertAsset: { _id: string } | null = null
    if (floorInsertFile && floorInsertFile.size > 0) {
      floorInsertAsset = await client.assets.upload('image', floorInsertFile, {
        filename: floorInsertFile.name,
      })
    }

    const orderId = generateOrderId()

    const config: LGConfig = {
      size: size as LGConfig['size'],
      shape: shape as LGConfig['shape'],
      shadow: { diameter: shadowDiameter, offsetX: shadowOffsetX, offsetY: shadowOffsetY },
      supportStems,
    }
    if ((shape === 'rect' || shape === 'oval') && shapeRatioW > 0 && shapeRatioH > 0) {
      config.shapeRatio = { width: shapeRatioW, height: shapeRatioH }
    }

    const doc: Record<string, unknown> = {
      _type: 'lightGeneratorOrder',
      orderId,
      status: 'submitted',
      customerName: name,
      customerContact: contact,
      config: JSON.stringify(config),
      silhouetteImage: { _type: 'image', asset: { _type: 'reference', _ref: silhouetteAsset._id } },
      submittedAt: new Date().toISOString(),
    }
    if (notes) doc.customerNotes = notes
    if (floorInsertAsset) {
      doc.floorInsertImage = { _type: 'image', asset: { _type: 'reference', _ref: floorInsertAsset._id } }
    }

    await client.create(doc as never)

    return Response.json({ orderId }, { status: 201 })
  } catch (err) {
    console.error('[light-generator-order] failed', err)
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}
