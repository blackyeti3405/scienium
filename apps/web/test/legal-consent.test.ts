import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { legalConsentShape } from '@/lib/legal/consent'

/**
 * The consent gate has to stay attached to every route that mints an account.
 *
 * The failure this exists to catch is not "the checkbox stopped working" — it is
 * a FOURTH signup path added later that nobody remembers to gate, leaving an
 * account created with no record that anyone agreed to anything. A mocked route
 * test would never see it, because the new route would simply not be in the
 * mock's list. So this walks the source and asserts the set of places that can
 * create a `User` row is exactly the set that is either gated or explicitly
 * exempt.
 */

const ROOT = process.cwd()
const CREATES_USER = /\buser\.create\(/

/**
 * The one creation site with no consent to collect: it backfills a row for a
 * teacher whose role arrived on a Clerk session claim, with no form and no
 * human present. Refusing there locks the teacher out; it does not produce an
 * agreement. Documented in `lib/legal/consent.ts`.
 */
const EXEMPT = new Set(['lib/teacher/auth.ts'])

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) out.push(full)
  }
  return out
}

describe('legal consent — the zod fragment', () => {
  const schema = z.object({ ...legalConsentShape }).strict()

  it('accepts an explicit true', () => {
    expect(schema.safeParse({ acceptedLegal: true }).success).toBe(true)
  })

  it.each([
    ['missing', {}],
    ['false', { acceptedLegal: false }],
    // A truthy non-boolean must not slip through: the record is evidence, and
    // "the client sent the string 'yes'" is not evidence that a box was ticked.
    ['a truthy string', { acceptedLegal: 'true' }],
    ['a number', { acceptedLegal: 1 }],
    ['null', { acceptedLegal: null }],
  ])('rejects %s', (_label, body) => {
    expect(schema.safeParse(body).success).toBe(false)
  })

  it('rejects with a message a person can act on', () => {
    const result = schema.safeParse({ acceptedLegal: false })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/Terms of Service and Privacy Policy/)
    }
  })
})

describe('legal consent — every account-creation route is gated', () => {
  const creators = [...walk(join(ROOT, 'app')), ...walk(join(ROOT, 'lib'))]
    .filter((f) => CREATES_USER.test(readFileSync(f, 'utf8')))
    .map((f) => relative(ROOT, f))
    .sort()

  it('finds the creation sites at all (a broken walk must fail, not pass)', () => {
    expect(creators.length).toBeGreaterThan(0)
  })

  it.each(creators.filter((f) => !EXEMPT.has(f)))('%s requires and records consent', (file) => {
    const src = readFileSync(join(ROOT, file), 'utf8')
    expect(src).toContain('legalConsentShape')
    expect(src).toContain('recordLegalAcceptance')
  })

  it('the exemption list names only files that still exist and still create users', () => {
    for (const exempt of EXEMPT) expect(creators).toContain(exempt)
  })
})
