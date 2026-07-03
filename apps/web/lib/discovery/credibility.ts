import type { CredibilityTier } from '@prisma/client'

// ── Deterministic host → credibility tier (NO ML, NO network, NO model) ───────
// Discovery v2 hard-req #2: credibility is a pure host→tier lookup. The SERVER is
// the sole authority — it derives the host from OUR resolved source URL and calls
// this before persisting (client-sent tier is advisory only, anti-forgery).

/**
 * Map a URL host to a credibility tier. Host is normalized (lowercased, `www.`
 * stripped) and matched longest-suffix-first so `pubmed.ncbi.nlm.nih.gov` wins
 * over the broader `ncbi.nlm.nih.gov` (PMC) rule.
 *
 *   arxiv.org                 → preprint       (not yet peer-reviewed)
 *   pubmed.ncbi.nlm.nih.gov   → peer_reviewed  (indexed journal article)
 *   ncbi.nlm.nih.gov (PMC)    → open_access    (free full text)
 *
 * Unknown hosts fall back to `preprint` (the most cautious "verify yourself"
 * label). In practice the server always passes a host from a URL WE resolved, so
 * unknowns shouldn't occur — the fallback just guarantees a total function.
 */
export function hostToTier(host: string): CredibilityTier {
  const h = host.toLowerCase().replace(/^www\./, '')

  // Order matters: most-specific host first (longest-suffix match).
  if (h === 'pubmed.ncbi.nlm.nih.gov' || h.endsWith('.pubmed.ncbi.nlm.nih.gov')) {
    return 'peer_reviewed'
  }
  if (h === 'pmc.ncbi.nlm.nih.gov' || h.endsWith('.pmc.ncbi.nlm.nih.gov')) {
    return 'open_access'
  }
  if (h === 'ncbi.nlm.nih.gov' || h.endsWith('.ncbi.nlm.nih.gov')) {
    return 'open_access'
  }
  if (h === 'arxiv.org' || h.endsWith('.arxiv.org')) {
    return 'preprint'
  }
  return 'preprint'
}

export interface TierMeta {
  /** Short human label shown on the credibility badge. */
  label: string
  /** One-line caveat (tooltip) telling the student what the tier means. */
  caveat: string
  /** Pixel-palette hex color for the badge / tree dot. */
  color: string
}

/**
 * Display metadata per tier — pixel palette + a one-line caveat so the student
 * does the "how much do I trust this?" thinking (never an AI judgement).
 */
export const TIER_META: Record<CredibilityTier, TierMeta> = {
  peer_reviewed: {
    label: 'Peer-reviewed',
    caveat: 'Published in an indexed journal — reviewed by other scientists.',
    color: '#4ADE80', // green
  },
  preprint: {
    label: 'Preprint',
    caveat: 'Not yet peer-reviewed — read critically and verify claims.',
    color: '#F5C518', // gold/amber (the app accent)
  },
  open_access: {
    label: 'Open access',
    caveat: 'Free full text — check whether it was peer-reviewed.',
    color: '#60A5FA', // blue
  },
}
