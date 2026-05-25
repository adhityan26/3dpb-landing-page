import { describe, it, expect, vi, beforeEach } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

import { POST } from '~/pages/api/light-generator-island-check'

function makeCtx(body: unknown, envOverrides: Partial<Record<string, string>> = {}) {
  return {
    request: new Request('https://test.local/api/light-generator-island-check', {
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

beforeEach(() => {
  fetchMock.mockReset()
})

describe('POST /api/light-generator-island-check', () => {
  it('returns fallback when OPS_API_URL is not configured', async () => {
    const ctx = makeCtx({ imageAssetId: 'abc' }, { OPS_API_URL: '' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.fallback).toBe(true)
    expect(body.hasFloatingIslands).toBeNull()
  })

  it('returns result from 3dpb-ops on success', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ hasFloatingIslands: true }), { status: 200 })
    )
    const ctx = makeCtx({ imageAssetId: 'image-id-123' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.hasFloatingIslands).toBe(true)
    expect(body.fallback).toBeUndefined()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://ops.example.com/api/island-check')
    expect((init as RequestInit).headers as Record<string, string>).toMatchObject({
      Authorization: 'Bearer test-secret',
    })
  })

  it('returns fallback when fetch throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network error'))
    const ctx = makeCtx({ imageAssetId: 'abc' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.fallback).toBe(true)
    expect(body.hasFloatingIslands).toBeNull()
  })

  it('returns fallback when 3dpb-ops returns non-200', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }))
    const ctx = makeCtx({ imageAssetId: 'abc' })
    const res = await POST(ctx as never)
    const body = await res.json()
    expect(body.fallback).toBe(true)
  })

  it('returns 400 when imageAssetId is missing', async () => {
    const ctx = makeCtx({})
    const res = await POST(ctx as never)
    expect(res.status).toBe(400)
  })
})
