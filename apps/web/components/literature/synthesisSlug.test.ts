import { describe, expect, it } from 'vitest'
import { cellKey, slugifyColumnLabel } from './synthesisSlug'

/**
 * Column ids persist to the DB and key every cell — a collision silently
 * merges two columns' cells. The collision walk is the load-bearing part.
 */

describe('slugifyColumnLabel', () => {
  it('slugifies a plain label', () => {
    expect(slugifyColumnLabel('Sample Size & Methods', new Set())).toBe('sample-size-methods')
  })

  it('duplicate labels get DISTINCT ids via the collision walk', () => {
    const taken = new Set<string>()
    const a = slugifyColumnLabel('Methods', taken)
    taken.add(a)
    const b = slugifyColumnLabel('Methods', taken)
    taken.add(b)
    const c = slugifyColumnLabel('Methods', taken)
    expect(a).toBe('methods')
    expect(b).toBe('methods-2')
    expect(c).toBe('methods-3')
    expect(new Set([a, b, c]).size).toBe(3)
  })

  it('a symbols-only label falls back to "column" (and still de-collides)', () => {
    const taken = new Set(['column'])
    expect(slugifyColumnLabel('???', taken)).toBe('column-2')
  })

  it('caps the base at 32 chars BEFORE the collision suffix', () => {
    const long = 'x'.repeat(80)
    const slug = slugifyColumnLabel(long, new Set())
    expect(slug).toBe('x'.repeat(32))
    const second = slugifyColumnLabel(long, new Set([slug]))
    expect(second).toBe(`${'x'.repeat(32)}-2`)
  })

  it('trims leading/trailing separators', () => {
    expect(slugifyColumnLabel('  --Key Findings--  ', new Set())).toBe('key-findings')
  })
})

describe('cellKey', () => {
  it('is the paperId:columnId composite', () => {
    expect(cellKey('p1', 'methods')).toBe('p1:methods')
  })
})
