import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { boundedText, cuid, optionalBoundedText, parseJson, zipString } from './validation'

/**
 * The shared request-validation helpers — used by ~50 routes. `boundedText`'s
 * `.max()` is what keeps every free-text field (much of which feeds LLM
 * prompts) bounded; dropping it would silently uncap them all, which is why
 * the caps get pinned here.
 */

function jsonReq(body: string): NextRequest {
  return new NextRequest('http://localhost/api/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  })
}

describe('parseJson', () => {
  const Schema = z.object({ name: boundedText(10) }).strict()

  it('malformed JSON → clean 400, not a thrown 500', async () => {
    const { data, error } = await parseJson(jsonReq('{not json'), Schema)
    expect(data).toBeNull()
    expect(error?.status).toBe(400)
  })

  it('unexpected fields are rejected by strict schemas (anti-mass-assignment)', async () => {
    const { error } = await parseJson(jsonReq('{"name":"ok","role":"admin"}'), Schema)
    expect(error?.status).toBe(400)
  })

  it('surfaces the failing field path in the message', async () => {
    const { error } = await parseJson(jsonReq('{}'), Schema)
    expect(error).not.toBeNull()
    expect((await error!.json()).error).toMatch(/^name: /)
  })

  it('returns typed data on success', async () => {
    const { data, error } = await parseJson(jsonReq('{"name":"  ok  "}'), Schema)
    expect(error).toBeNull()
    expect(data).toEqual({ name: 'ok' }) // trimmed
  })
})

describe('shared field schemas', () => {
  it('boundedText enforces 1..max after trimming', () => {
    const s = boundedText(5)
    expect(s.safeParse('hello').success).toBe(true)
    expect(s.safeParse('toolong').success).toBe(false)
    expect(s.safeParse('   ').success).toBe(false) // trims to empty
  })

  it('optionalBoundedText allows absence but still caps length', () => {
    const s = optionalBoundedText(5)
    expect(s.safeParse(undefined).success).toBe(true)
    expect(s.safeParse('toolong').success).toBe(false)
  })

  it('cuid rejects UUIDs, SQL noise, and empty strings', () => {
    expect(cuid.safeParse('cmre80h450004o3hv5xzc6a86').success).toBe(true)
    expect(cuid.safeParse('123e4567-e89b-12d3-a456-426614174000').success).toBe(false)
    expect(cuid.safeParse("1; DROP TABLE papers;--").success).toBe(false)
    expect(cuid.safeParse('').success).toBe(false)
  })

  it('zipString accepts 5-digit and ZIP+4, rejects the rest', () => {
    expect(zipString.safeParse('06001').success).toBe(true)
    expect(zipString.safeParse('06001-1234').success).toBe(true)
    expect(zipString.safeParse('600').success).toBe(false)
    expect(zipString.safeParse('abcde').success).toBe(false)
  })
})
