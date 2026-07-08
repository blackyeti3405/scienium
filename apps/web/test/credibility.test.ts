import { describe, it, expect } from 'vitest'
import {
  extractDoi,
  tierFromDoi,
  tierMeta,
  SELF_UPLOADED_META,
  TIER_META,
  VETTING_CHECKLIST,
} from '@/lib/discovery/credibility'

describe('extractDoi', () => {
  it('finds a DOI in sample paper text', () => {
    const text = `Journal of Examples\nhttps://doi.org/10.1234/example.2024.001\nAbstract: ...`
    expect(extractDoi(text)).toBe('10.1234/example.2024.001')
  })

  it('returns null when the text has no DOI', () => {
    const text = 'Just a plain paper with no registrar identifiers anywhere in it.'
    expect(extractDoi(text)).toBeNull()
  })
})

describe('tierFromDoi', () => {
  it('returns peer_reviewed for a valid DOI', () => {
    expect(tierFromDoi('10.1234/example.2024.001')).toBe('peer_reviewed')
  })
})

describe('tierMeta', () => {
  it('returns SELF_UPLOADED_META for null', () => {
    expect(tierMeta(null)).toBe(SELF_UPLOADED_META)
  })

  it('returns the preprint meta for "preprint"', () => {
    expect(tierMeta('preprint')).toBe(TIER_META.preprint)
  })
})

describe('VETTING_CHECKLIST', () => {
  it('has exactly 5 items, each with a non-empty label and hint', () => {
    expect(VETTING_CHECKLIST).toHaveLength(5)
    for (const item of VETTING_CHECKLIST) {
      expect(item.label.length).toBeGreaterThan(0)
      expect(item.hint.length).toBeGreaterThan(0)
    }
  })
})
