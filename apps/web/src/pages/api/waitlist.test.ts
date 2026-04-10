import { describe, it, expect, vi, beforeEach } from 'vitest'

const createMock = vi.fn()
vi.mock('@sanity/client', () => ({
  createClient: vi.fn(() => ({
    create: createMock,
  })),
}))

import { POST } from './waitlist'

function makeRequest(body: unknown): Request {
  return new Request('https://test.local/api/waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeContext(overrides: Partial<Record<string, string>> = {}) {
  return {
    request: undefined as unknown as Request,
    locals: {
      runtime: {
        env: {
          PUBLIC_SANITY_PROJECT_ID: 'abc123',
          PUBLIC_SANITY_DATASET: 'production',
          PUBLIC_SANITY_API_VERSION: '2024-10-01',
          SANITY_WRITE_TOKEN: 'sk-test',
          ...overrides,
        },
      },
    },
  }
}

beforeEach(() => {
  createMock.mockReset()
})

describe('POST /api/waitlist', () => {
  it('rejects invalid emails with 400', async () => {
    const ctx = makeContext()
    ctx.request = makeRequest({ email: 'not-an-email' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_email')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('rejects empty body with 400', async () => {
    const ctx = makeContext()
    ctx.request = makeRequest({})
    const res = await POST(ctx as never)
    expect(res.status).toBe(400)
  })

  it('writes a waitlistEntry document and returns 200 on success', async () => {
    createMock.mockResolvedValueOnce({ _id: 'wl-1' })
    const ctx = makeContext()
    ctx.request = makeRequest({ email: 'test@example.com', name: 'Test' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(createMock).toHaveBeenCalledTimes(1)
    const doc = createMock.mock.calls[0][0]
    expect(doc._type).toBe('waitlistEntry')
    expect(doc.email).toBe('test@example.com')
    expect(doc.name).toBe('Test')
    expect(doc.source).toBe('silhouette-generator')
    expect(typeof doc.submittedAt).toBe('string')
  })

  it('returns 500 when the write token is missing', async () => {
    const ctx = makeContext({ SANITY_WRITE_TOKEN: '' })
    ctx.request = makeRequest({ email: 'test@example.com' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('server_misconfigured')
  })

  it('returns 500 and logs when the sanity write throws', async () => {
    createMock.mockRejectedValueOnce(new Error('boom'))
    const ctx = makeContext()
    ctx.request = makeRequest({ email: 'test@example.com' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(500)
  })

  it('omits name when not provided', async () => {
    createMock.mockResolvedValueOnce({ _id: 'wl-2' })
    const ctx = makeContext()
    ctx.request = makeRequest({ email: 'just@email.com' })
    const res = await POST(ctx as never)
    expect(res.status).toBe(200)
    const doc = createMock.mock.calls[0][0]
    expect(doc.name).toBeUndefined()
  })
})
