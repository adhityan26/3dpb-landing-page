import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

import { POST } from '~/pages/api/light-generator-shadow-preview'

function makeCtx(body: unknown, envOverrides: Partial<Record<string, string>> = {}) {
  return {
    request: new Request('https://test.local/api/light-generator-shadow-preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    locals: {
      runtime: {
        env: {
          OPS_API_URL: 'https://ops.example.com',
          OPS_API_SECRET: 'test-secret',
          ...envOverrides,
        },
      },
    },
  }
}

const VALID_CONFIG = { diameter: 15, offsetX: 0, offsetY: 0 }

beforeEach(() => {
  fetchMock.mockReset()
})

describe('POST /api/light-generator-shadow-preview', () => {
  it('returns fallback JSON when OPS_API_URL is not configured', async () => {
    const ctx = makeCtx({ imageAssetId: 'abc', config: VALID_CONFIG }, { OPS_API_URL: '' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.fallback).toBe(true)
  })

  it('forwards PNG bytes on success', async () => {
    const pngBytes = new Uint8Array([137, 80, 78, 71]) // PNG magic bytes
    fetchMock.mockResolvedValueOnce(
      new Response(pngBytes, { status: 200, headers: { 'content-type': 'image/png' } })
    )
    const ctx = makeCtx({ imageAssetId: 'img-123', config: VALID_CONFIG })
    const res = await POST(ctx as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/png')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://ops.example.com/api/shadow-preview')
    expect((init as RequestInit).headers as Record<string, string>).toMatchObject({
      Authorization: 'Bearer test-secret',
    })
  })

  it('returns fallback JSON when fetch throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('timeout'))
    const ctx = makeCtx({ imageAssetId: 'abc', config: VALID_CONFIG })
    const res = await POST(ctx as never)
    const body = await res.json()
    expect(body.fallback).toBe(true)
  })

  it('returns fallback JSON when ops returns non-200', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }))
    const ctx = makeCtx({ imageAssetId: 'abc', config: VALID_CONFIG })
    const res = await POST(ctx as never)
    const body = await res.json()
    expect(body.fallback).toBe(true)
  })

  it('returns 400 when imageAssetId is missing', async () => {
    const ctx = makeCtx({ config: VALID_CONFIG })
    const res = await POST(ctx as never)
    expect(res.status).toBe(400)
  })

  it('returns 400 when config is missing', async () => {
    const ctx = makeCtx({ imageAssetId: 'abc' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(400)
  })
})
