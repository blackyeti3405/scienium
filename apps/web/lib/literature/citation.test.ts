import { describe, it, expect } from 'vitest'
import {
  parseYear,
  formatApa,
  formatMla,
  formatIeee,
  buildCitations,
} from '@/lib/literature/citation'

describe('parseYear', () => {
  it('extracts the UTC year from a Date', () => {
    expect(parseYear(new Date('2021-06-15T00:00:00Z'))).toBe(2021)
  })
  it('falls back when the date is null or invalid', () => {
    expect(parseYear(null)).toBeNull()
    expect(parseYear(null, 1999)).toBe(1999)
    expect(parseYear(new Date('not-a-date'), 2000)).toBe(2000)
  })
})

describe('formatApa', () => {
  it('single author: Last, F. M. (Year). Title.', () => {
    expect(
      formatApa({ title: 'On Widgets', authors: ['Smith, Jane Q'], year: 2020 }),
    ).toBe('Smith, J. Q. (2020). On Widgets.')
  })
  it('two authors use an ampersand before the last', () => {
    const out = formatApa({ title: 'Gears', authors: ['Smith, Jane', 'Doe, John'], year: 2019 })
    expect(out).toContain('Smith, J., & Doe, J.')
    expect(out).toContain('(2019).')
  })
  it('no authors leads with the title', () => {
    expect(formatApa({ title: 'Anon Report', authors: [], year: 2018 })).toBe(
      '(2018). Anon Report.',
    )
  })
  it('unknown year uses (n.d.) and appends the url', () => {
    const out = formatApa({ title: 'X', authors: ['A B'], year: null, url: 'https://x.test/1' })
    expect(out).toContain('(n.d.).')
    expect(out).toContain('https://x.test/1')
  })
})

describe('formatMla', () => {
  it('single author inverted with a trailing period', () => {
    expect(formatMla({ title: 'On Widgets', authors: ['Jane Smith'], year: 2020 })).toContain(
      'Smith, Jane.',
    )
  })
  it('3+ authors collapse to et al.', () => {
    const out = formatMla({
      title: 'Team Paper',
      authors: ['Jane Smith', 'John Doe', 'Al Roe'],
      year: 2021,
    })
    expect(out).toContain('Smith, Jane, et al.')
  })
})

describe('formatIeee', () => {
  it('initials-first name form', () => {
    expect(formatIeee({ title: 'On Widgets', authors: ['Jane Q Smith'], year: 2020 })).toContain(
      'J. Q. Smith',
    )
  })
  it('multi-author uses ", and " before the last', () => {
    const out = formatIeee({
      title: 'Team Paper',
      authors: ['Jane Smith', 'John Doe', 'Al Roe'],
      year: 2021,
    })
    expect(out).toContain('and A. Roe')
  })
})

describe('buildCitations', () => {
  it('returns all three non-empty styles + the year', () => {
    const c = buildCitations({ title: 'A Study', authors: ['Jane Smith'], year: 2022 })
    expect(c.year).toBe(2022)
    expect(c.apa.length).toBeGreaterThan(0)
    expect(c.mla.length).toBeGreaterThan(0)
    expect(c.ieee.length).toBeGreaterThan(0)
  })
  it('never throws on a malformed single-token author', () => {
    expect(() => buildCitations({ title: 'Org Report', authors: ['NASA'], year: 2020 })).not.toThrow()
    const c = buildCitations({ title: 'Org Report', authors: ['NASA'], year: 2020 })
    expect(c.apa).toContain('NASA')
  })
})
