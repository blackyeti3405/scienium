import { NextRequest, NextResponse } from 'next/server'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import { MAX_BODY_BYTES, parseJson } from '@/lib/validation'
import { withTeamRoute } from '@/lib/api/with-route'

/**
 * P2-S8 — an infrastructure byte ceiling in front of `req.json()`.
 *
 * Zod's `.max()` caps are SEMANTIC: they run on an object that `req.json()` has
 * already fully materialized. A route whose schema is `{ name: max(10) }` would
 * still buffer and `JSON.parse` a 50 MB body before deciding it was too long —
 * one unauthenticated-ish request per process, at 50 MB of heap each, and the
 * strictest schema in the app cannot stop it.
 *
 * These tests pin the ATTACK, not the shape: the body must be refused BEFORE
 * allocation, which means (a) `JSON.parse` never sees it and (b) the request
 * stream is not drained. A test that only asserted `error?.status === 413` would
 * pass against a cap applied after parsing.
 */

const Schema = z.object({ name: z.string().max(10) }).strict()

/** A body whose stream reports how much of it the server actually pulled. */
function streamingReq(chunks: string[], opts: { declareLength?: boolean } = {}) {
  const encoder = new TextEncoder()
  const encoded = chunks.map((c) => encoder.encode(c))
  let pulled = 0
  let cancelled = false

  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (pulled >= encoded.length) {
          controller.close()
          return
        }
        controller.enqueue(encoded[pulled++])
      },
      cancel() {
        cancelled = true
      },
    },
    // highWaterMark 0 — otherwise the stream pre-fetches one chunk at
    // construction and `bytesPulled` would measure the queuing strategy rather
    // than what the code under test actually read.
    { highWaterMark: 0 },
  )

  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.declareLength) {
    headers['content-length'] = String(encoded.reduce((n, c) => n + c.byteLength, 0))
  }

  // `duplex: 'half'` is required by undici for a stream body and is absent from
  // the RequestInit that NextRequest's constructor signature resolves to.
  const init = { method: 'POST', headers, body, duplex: 'half' }
  const req = new NextRequest(
    'http://localhost/api/x',
    init as ConstructorParameters<typeof NextRequest>[1],
  )

  return {
    req,
    get bytesPulled() {
      return encoded.slice(0, pulled).reduce((n, c) => n + c.byteLength, 0)
    },
    get cancelled() {
      return cancelled
    },
  }
}

/** A single oversized JSON body, split into 64 KiB stream chunks. */
function hugeBody(totalBytes: number): string[] {
  const filler = 'A'.repeat(totalBytes)
  const json = JSON.stringify({ name: filler })
  const chunks: string[] = []
  for (let i = 0; i < json.length; i += 64 * 1024) chunks.push(json.slice(i, i + 64 * 1024))
  return chunks
}

let parseSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  parseSpy = vi.spyOn(JSON, 'parse')
})
afterEach(() => {
  parseSpy.mockRestore()
})

/** Longest string JSON.parse was asked to read during the call. */
function longestParsedInput(): number {
  let longest = 0
  for (const call of parseSpy.mock.calls) {
    const arg = call[0]
    if (typeof arg === 'string') longest = Math.max(longest, arg.length)
  }
  return longest
}

describe('parseJson — body byte ceiling (P2-S8)', () => {
  it('refuses an oversized body with a declared Content-Length without reading ONE byte of it', async () => {
    const s = streamingReq(hugeBody(4 * 1024 * 1024), { declareLength: true })
    const { data, error } = await parseJson(s.req, Schema)

    expect(data).toBeNull()
    expect(error?.status).toBe(413)
    // The attack: allocation. Nothing was pulled, nothing was parsed.
    expect(s.bytesPulled).toBe(0)
    expect(longestParsedInput()).toBeLessThan(MAX_BODY_BYTES)
  })

  it('refuses an oversized body that LIES about (omits) its length, mid-stream', async () => {
    // Content-Length is a client-supplied hint; chunked uploads have none. The
    // ceiling must also hold while reading.
    const chunks = hugeBody(4 * 1024 * 1024)
    const s = streamingReq(chunks)
    const { data, error } = await parseJson(s.req, Schema)

    expect(data).toBeNull()
    expect(error?.status).toBe(413)
    // Stopped early: at most one chunk past the ceiling was ever buffered.
    expect(s.bytesPulled).toBeLessThanOrEqual(MAX_BODY_BYTES + 64 * 1024)
    expect(s.bytesPulled).toBeLessThan(chunks.join('').length)
    expect(longestParsedInput()).toBeLessThan(MAX_BODY_BYTES + 64 * 1024)
  })

  it('returns the project standard error shape on 413', async () => {
    const s = streamingReq(hugeBody(1024 * 1024), { declareLength: true })
    const { error } = await parseJson(s.req, Schema)
    expect(await error!.json()).toEqual({ error: 'Request body too large' })
  })

  it('a body exactly AT the ceiling is accepted', async () => {
    // `{"name":"AAA…"}` padded so the encoded body is exactly MAX_BODY_BYTES.
    const overhead = '{"name":""}'.length
    const body = JSON.stringify({ name: 'A'.repeat(MAX_BODY_BYTES - overhead) })
    expect(new TextEncoder().encode(body).byteLength).toBe(MAX_BODY_BYTES)

    const s = streamingReq([body], { declareLength: true })
    const { data, error } = await parseJson(s.req, z.object({ name: z.string() }).strict())
    expect(error).toBeNull()
    expect(data!.name).toHaveLength(MAX_BODY_BYTES - overhead)
  })

  it('one byte over the ceiling is refused', async () => {
    const overhead = '{"name":""}'.length
    const body = JSON.stringify({ name: 'A'.repeat(MAX_BODY_BYTES - overhead + 1) })
    const s = streamingReq([body], { declareLength: true })
    const { error } = await parseJson(s.req, z.object({ name: z.string() }).strict())
    expect(error?.status).toBe(413)
  })

  it('a raised per-route override accepts what the default would refuse', async () => {
    const body = JSON.stringify({ name: 'A'.repeat(MAX_BODY_BYTES) })
    const schema = z.object({ name: z.string() }).strict()

    const refused = await parseJson(streamingReq([body], { declareLength: true }).req, schema)
    expect(refused.error?.status).toBe(413)

    const allowed = await parseJson(streamingReq([body], { declareLength: true }).req, schema, {
      maxBytes: 4 * 1024 * 1024,
    })
    expect(allowed.error).toBeNull()
    expect(allowed.data!.name).toHaveLength(MAX_BODY_BYTES)
  })

  it('a tiny override DOES lower the ceiling — documented, not prevented', async () => {
    // The title used to say "cannot be used to lower the ceiling", which is the
    // opposite of what the body asserts and of what the code does. Nothing here
    // stops a route from passing a tiny `maxBytes`; the consequence is that a
    // validation 400 becomes an unexplained 413, and this test records that the
    // behaviour was chosen rather than overlooked. The ceiling is infrastructure
    // and is only ever meant to be RAISED — a smaller value is a route bug that
    // review has to catch, because this function will not.
    const s = streamingReq(['{"name":"ok"}'], { declareLength: true })
    const { error } = await parseJson(s.req, Schema, { maxBytes: 4 })
    expect(error?.status).toBe(413)
  })

  it('still returns 400 (not 413) for malformed JSON under the ceiling', async () => {
    const s = streamingReq(['{not json'], { declareLength: true })
    const { error } = await parseJson(s.req, Schema)
    expect(error?.status).toBe(400)
  })
})

vi.mock('@/lib/api/route-context', () => ({
  requireTeamContext: vi.fn().mockResolvedValue({
    ctx: { userId: 'u', dbUserId: 'd', teamId: 't', phase: 'setup', labType: null },
    error: null,
  }),
}))

describe('withTeamRoute — the ceiling is inherited, not opted into', () => {
  /**
   * The whole point of putting the ceiling in shared plumbing: every route that
   * declares a `body` schema gets it without asking, and the handler NEVER runs
   * for an over-ceiling request. ~50 routes call `parseJson` directly and the
   * rest go through here — both paths land on the same guard.
   */
  const Big = z.object({ name: z.string() }).strict()

  async function callWith(maxBytes: number | undefined, bodyBytes: number) {
    const handler = vi.fn(async () => NextResponse.json({ ok: true }))
    const route = withTeamRoute({ tier: 'mutate', body: Big, maxBytes }, handler)
    const body = JSON.stringify({ name: 'A'.repeat(bodyBytes) })
    const res = await route(
      new NextRequest('http://localhost/api/x', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      }),
      { params: Promise.resolve({}) },
    )
    return { status: res.status, handler }
  }

  it('a route that declares no ceiling still refuses an oversized body — and its handler never runs', async () => {
    const { status, handler } = await callWith(undefined, MAX_BODY_BYTES + 1)
    expect(status).toBe(413)
    expect(handler).not.toHaveBeenCalled()
  })

  it('a route with a RAISED override accepts exactly what the default refuses', async () => {
    const { status, handler } = await callWith(4 * 1024 * 1024, MAX_BODY_BYTES + 1)
    expect(status).toBe(200)
    expect(handler).toHaveBeenCalledOnce()
  })
})
