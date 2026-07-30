import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ApiError, requestJson } from './client'

/**
 * The shared fetch wrapper many hooks ride. The contract worth pinning: a
 * non-2xx ALWAYS throws ApiError (carrying the server's error string when it
 * sent one), a 2xx is schema-validated so a drifted response shape fails
 * loudly instead of flowing into state, and a non-JSON error body still
 * produces a clean ApiError rather than a JSON parse crash.
 */

function stubFetch(status: number, body: string, contentType = 'application/json') {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(body, { status, headers: { 'content-type': contentType } })),
  )
}

const Shape = z.object({ value: z.number() })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('requestJson', () => {
  it('returns the parsed body on a 2xx', async () => {
    stubFetch(200, '{"value":42}')
    expect(await requestJson('/api/x', Shape)).toEqual({ value: 42 })
  })

  it('a 2xx with a DRIFTED shape throws (zod), never flows into state', async () => {
    stubFetch(200, '{"value":"not a number"}')
    await expect(requestJson('/api/x', Shape)).rejects.toThrow()
  })

  it("a non-2xx throws ApiError carrying the server's error message and status", async () => {
    stubFetch(429, '{"error":"Slow down"}')
    const err = await requestJson('/api/x', Shape).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.message).toBe('Slow down')
    expect(err.status).toBe(429)
  })

  it('a non-2xx with a NON-JSON body (e.g. an HTML error page) still yields a clean ApiError', async () => {
    stubFetch(502, '<html>Bad Gateway</html>', 'text/html')
    const err = await requestJson('/api/x', Shape).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.message).toBe('Request failed (502)')
    expect(err.status).toBe(502)
  })

  it('a non-2xx whose error field is not a string falls back to the generic message', async () => {
    stubFetch(400, '{"error":{"nested":"object"}}')
    const err = await requestJson('/api/x', Shape).catch((e) => e)
    expect(err.message).toBe('Request failed (400)')
  })
})
