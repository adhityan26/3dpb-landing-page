import { describe, it, expect, vi, beforeEach } from 'vitest'

const createMock = vi.fn()
const assetsUploadMock = vi.fn()

vi.mock('@sanity/client', () => ({
  createClient: vi.fn(() => ({
    create: createMock,
    assets: { upload: assetsUploadMock },
  })),
}))

import { POST } from '~/pages/api/light-generator-order'

function makeCtx(formData: FormData, envOverrides: Partial<Record<string, string>> = {}) {
  return {
    request: new Request('https://test.local/api/light-generator-order', {
      method: 'POST',
      body: formData,
    }),
    locals: {
      runtime: {
        env: {
          PUBLIC_SANITY_PROJECT_ID: 'proj123',
          PUBLIC_SANITY_DATASET: 'production',
          PUBLIC_SANITY_API_VERSION: '2024-10-01',
          SANITY_WRITE_TOKEN: 'sk-test',
          ...envOverrides,
        },
      },
    },
  }
}

function makeValidFormData(overrides: Record<string, string | File> = {}): FormData {
  const fd = new FormData()
  fd.set('name', 'Budi Santoso')
  fd.set('contact', '08123456789')
  fd.set('size', 'M')
  fd.set('shape', 'circle')
  fd.set('shadowDiameter', '15')
  fd.set('shadowOffsetX', '0')
  fd.set('shadowOffsetY', '0')
  fd.set('supportStems', 'false')
  fd.set('silhouette', new File(['img'], 'kucing.png', { type: 'image/png' }))
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v)
  return fd
}

beforeEach(() => {
  createMock.mockReset()
  assetsUploadMock.mockReset()
})

describe('POST /api/light-generator-order', () => {
  it('returns 400 when name is missing', async () => {
    const fd = makeValidFormData()
    fd.set('name', '')
    const res = await POST(makeCtx(fd) as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('validation_error')
  })

  it('returns 400 when size is invalid', async () => {
    const res = await POST(makeCtx(makeValidFormData({ size: 'XL' })) as never)
    expect(res.status).toBe(400)
  })

  it('returns 400 when shape is invalid', async () => {
    const res = await POST(makeCtx(makeValidFormData({ shape: 'hexagon' })) as never)
    expect(res.status).toBe(400)
  })

  it('returns 400 when silhouette is missing', async () => {
    const fd = makeValidFormData()
    fd.delete('silhouette')
    const res = await POST(makeCtx(fd) as never)
    expect(res.status).toBe(400)
  })

  it('returns 201 with orderId on success', async () => {
    assetsUploadMock.mockResolvedValue({ _id: 'image-asset-1' })
    createMock.mockResolvedValueOnce({ _id: 'doc-1' })

    const res = await POST(makeCtx(makeValidFormData()) as never)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(typeof body.orderId).toBe('string')
    expect(body.orderId).toMatch(/^LG-\d{8}-[A-Z0-9]{4}$/)
  })

  it('creates sanity doc with correct fields', async () => {
    assetsUploadMock.mockResolvedValue({ _id: 'image-asset-1' })
    createMock.mockResolvedValueOnce({ _id: 'doc-1' })

    await POST(makeCtx(makeValidFormData()) as never)

    const doc = createMock.mock.calls[0][0]
    expect(doc._type).toBe('lightGeneratorOrder')
    expect(doc.customerName).toBe('Budi Santoso')
    expect(doc.customerContact).toBe('08123456789')
    expect(doc.status).toBe('submitted')
    expect(typeof doc.config).toBe('string')
    const config = JSON.parse(doc.config)
    expect(config.size).toBe('M')
    expect(config.shape).toBe('circle')
    expect(config.shadow.diameter).toBe(15)
    expect(typeof doc.submittedAt).toBe('string')
  })

  it('uploads optional floorInsert when provided', async () => {
    assetsUploadMock.mockResolvedValue({ _id: 'image-asset-x' })
    createMock.mockResolvedValueOnce({ _id: 'doc-1' })

    const fd = makeValidFormData({
      floorInsert: new File(['fl'], 'floor.png', { type: 'image/png' }),
    })
    await POST(makeCtx(fd) as never)

    expect(assetsUploadMock).toHaveBeenCalledTimes(2)
    const doc = createMock.mock.calls[0][0]
    expect(doc.floorInsertImage).toBeDefined()
  })

  it('returns 500 when sanity write token is missing', async () => {
    const res = await POST(makeCtx(makeValidFormData(), { SANITY_WRITE_TOKEN: '' }) as never)
    expect(res.status).toBe(500)
  })

  it('returns 500 when sanity create throws', async () => {
    assetsUploadMock.mockResolvedValue({ _id: 'img-1' })
    createMock.mockRejectedValueOnce(new Error('boom'))
    const res = await POST(makeCtx(makeValidFormData()) as never)
    expect(res.status).toBe(500)
  })
})
