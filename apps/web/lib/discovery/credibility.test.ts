import { describe, expect, it } from 'vitest'
import { hostToTier } from './credibility'

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
