// #11: interest-tier cycle + shared visual metadata (color, shape, glyph, label).
// Single source of truth for DiscoveryTree's SVG swatch and DiscoveryTopicList's
// plain glyphs — was previously hand-duplicated between the two components.

export type InterestLevel = 'high' | 'mid' | 'low'

export interface InterestMeta {
  color: string
  /** SVG shape drawn by DiscoveryTree's swatch. */
  shape: 'circle' | 'triangle' | 'square'
  /** Plain-text glyph drawn by DiscoveryTopicList. */
  glyph: string
  label: string
}

export const INTEREST_META: Record<InterestLevel, InterestMeta> = {
  high: { color: '#4ADE80', shape: 'circle', glyph: '●', label: 'Interested' },
  mid: { color: '#F97316', shape: 'triangle', glyph: '▲', label: 'Kind of interested' },
  low: { color: '#EF4444', shape: 'square', glyph: '■', label: 'Not interested' },
}

const INTEREST_CYCLE: (InterestLevel | null)[] = [null, 'high', 'mid', 'low']

/** Cycle a node's interest tier: unset → high → mid → low → unset. */
export function nextInterest(current: InterestLevel | null | undefined): InterestLevel | null {
  const idx = INTEREST_CYCLE.indexOf(current ?? null)
  return INTEREST_CYCLE[(idx + 1) % INTEREST_CYCLE.length]
}
