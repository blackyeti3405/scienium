import { describe, expect, it } from 'vitest'
import {
  extractDoi,
  hostToTier,
  tierMeta,
  SELF_UPLOADED_META,
  TIER_META,
  VETTING_CHECKLIST,
} from './credibility'

/**
 * Host → credibility tier for the badge students use to judge sources.
 * Suffix precedence is the interesting logic: pubmed.ncbi.nlm.nih.gov must
 * beat the broader ncbi.nlm.nih.gov rule, and unknown hosts must fall to the
 * most cautious tier rather than flattering the source.
 */

describe('hostToTier', () => {
  it('pubmed wins over the broader ncbi suffix (peer_reviewed)', () => {
    expect(hostToTier('pubmed.ncbi.nlm.nih.gov')).toBe('peer_reviewed')
  })

  it('pmc and generic ncbi resolve to open_access', () => {
    expect(hostToTier('pmc.ncbi.nlm.nih.gov')).toBe('open_access')
    expect(hostToTier('ncbi.nlm.nih.gov')).toBe('open_access')
  })

  it('arxiv resolves to preprint', () => {
    expect(hostToTier('arxiv.org')).toBe('preprint')
  })

  it('strips a www. prefix before matching', () => {
    expect(hostToTier('www.pubmed.ncbi.nlm.nih.gov')).toBe('peer_reviewed')
  })

  it('a lookalike host does NOT inherit a real tier via substring', () => {
    // Suffix matching, not includes(): evil-pubmed.ncbi.nlm.nih.example must
    // not read as peer-reviewed.
    expect(hostToTier('pubmed.ncbi.nlm.nih.gov.evil.example')).toBe('preprint')
  })

  it('unknown hosts fall back to the most cautious tier', () => {
    expect(hostToTier('some-random-journal.example')).toBe('preprint')
  })
})

// ---------------------------------------------------------------------------
// Merged from test/credibility.test.ts — one module, one test home.
// ---------------------------------------------------------------------------

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

describe('DOI is an identifier, not a review status (P1-S11)', () => {
  it('exposes no DOI→tier mapping — a DOI cannot prove peer review', async () => {
    const mod = await import('./credibility')
    expect('tierFromDoi' in mod).toBe(false)
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
  it('has at least 5 items, each with a non-empty label and hint', () => {
    expect(VETTING_CHECKLIST.length).toBeGreaterThanOrEqual(5)
    for (const item of VETTING_CHECKLIST) {
      expect(item.label.length).toBeGreaterThan(0)
      expect(item.hint.length).toBeGreaterThan(0)
    }
  })
})
