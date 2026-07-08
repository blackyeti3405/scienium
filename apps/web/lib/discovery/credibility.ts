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

// ── F12: Literature Review credibility badge (read-time resolution) ──────────
// "Self-uploaded" is a UI-only fallback for papers with no derivable tier
// (raw uploads with no DOI, or plain `text` sources) — deliberately NOT a 4th
// `CredibilityTier` enum value (that would be a schema change). The API
// returns `credibilityTier: CredibilityTier | null`; the client resolves
// `null` to this meta via `tierMeta()` below.
export const SELF_UPLOADED_META: TierMeta = {
  label: 'Self-uploaded',
  caveat: 'You uploaded this — no source host to vouch for it. Vet it yourself using the checklist.',
  color: '#94A3B8', // slate — neutral, distinct from the 3 tier colors
}

/** Single resolver the UI calls: maps a nullable tier to its display metadata. */
export function tierMeta(tier: CredibilityTier | null): TierMeta {
  return tier ? TIER_META[tier] : SELF_UPLOADED_META
}

// DOI regex: registrar prefix `10.xxxx` (4-9 digits) + suffix of the
// characters DOIs commonly use. Scanning only the first ~4000 chars of full
// text keeps this cheap and matches where a DOI typically appears (title
// page / header / footer), not deep in references.
const DOI_RE = /\b10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/

/**
 * Find a DOI in raw extracted PDF text, deterministically (no network, no
 * LLM). Only scans the first ~4000 chars — where a DOI is conventionally
 * printed — and trims trailing punctuation a sentence boundary may have
 * glued on (e.g. a trailing `.` or `)` that isn't part of the DOI itself).
 */
export function extractDoi(text: string): string | null {
  const match = text.slice(0, 4000).match(DOI_RE)
  if (!match) return null
  return match[0].replace(/[.,;:)\]]+$/, '') || null
}

/**
 * Deterministic, offline DOI → tier mapping. A DOI is only minted by a
 * registrar (Crossref, DataCite, …) for a formally published/versioned work —
 * so its mere presence implies "published somewhere," the cautious signal we
 * can support without resolving the DOI against any network. We have no
 * resolved host for a raw upload (unlike a Discovery-promoted source), so we
 * can't distinguish peer-reviewed from open-access from a DOI alone — treat
 * every registered DOI as `peer_reviewed`, the tier that best matches "this
 * is a real, indexed publication."
 */
export function tierFromDoi(_doi: string): CredibilityTier {
  return 'peer_reviewed'
}

/**
 * Static "how to vet a source" checklist — pure authored content, no LLM.
 * Shown in the Q&A panel so students do the credibility judgement themselves
 * rather than trusting the badge alone.
 */
export const VETTING_CHECKLIST: { key: string; label: string; hint: string }[] = [
  {
    key: 'authorship',
    label: 'Authorship & affiliation',
    hint: 'Who wrote this, and what institution or lab are they affiliated with? Real experts publish under their real names and institutions.',
  },
  {
    key: 'funding',
    label: 'Funding disclosure',
    hint: 'Does the paper disclose who paid for the research? A funder with a stake in the outcome (e.g. the manufacturer of the product being tested) is a red flag worth weighing.',
  },
  {
    key: 'retraction',
    label: 'Retraction check',
    hint: 'Has this paper (or its journal) been flagged for retraction or correction? Search the title plus "retraction" before you rely on it.',
  },
  {
    key: 'publisher',
    label: 'Publisher reputation',
    hint: 'Is it in a journal or on a platform you recognize as legitimate (an indexed journal, arXiv, PubMed) — or a site you\'ve never heard of with no editorial process?',
  },
  {
    key: 'citations',
    label: 'Citation count',
    hint: 'How many other papers cite this one? A widely-cited paper has been checked and used by other researchers; a paper with zero citations may be too new or too weak to have caught on.',
  },
]
