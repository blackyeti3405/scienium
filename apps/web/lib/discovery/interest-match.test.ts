import { describe, expect, it } from 'vitest'
import { isConnected, matchInterests } from './interest-match'

/**
 * The judge-defensible "NO LLM" topic ↔ interest overlap. The ≥3-char token
 * rule is the load-bearing detail: without it, "AI" or "of" would connect
 * every interest to every topic and the feature would flatter everyone.
 */

describe('isConnected', () => {
  it('connects on whole-phrase containment either direction', () => {
    expect(isConnected('Coral reef bleaching', 'coral reef')).toBe(true)
    expect(isConnected('reefs', 'Coral reef bleaching and reefs')).toBe(true)
  })

  it('connects on a shared ≥3-char token', () => {
    expect(isConnected('Magnet levitation trains', 'I love magnet experiments')).toBe(true)
  })

  it('short tokens (< 3 chars) never connect on their own', () => {
    expect(isConnected('AI in medicine', 'AI')).toBe(true) // phrase containment, fine
    expect(isConnected('Marine biology', 'an of it')).toBe(false) // all short/stop tokens
  })

  it('is case-insensitive', () => {
    expect(isConnected('CORAL Reefs', 'coral')).toBe(true)
  })

  it('empty topic or interest never connects', () => {
    expect(isConnected('', 'coral')).toBe(false)
    expect(isConnected('coral', '   ')).toBe(false)
  })

  it('disjoint vocabularies do not connect', () => {
    expect(isConnected('Coral reef bleaching', 'medieval poetry')).toBe(false)
  })
})

describe('matchInterests', () => {
  it('preserves order and attribution while marking connections', () => {
    const out = matchInterests('Coral reefs', [
      { text: 'coral', createdByUserId: 'u1' },
      { text: 'trains', createdByUserId: 'u2' },
    ])
    expect(out).toEqual([
      { text: 'coral', createdByUserId: 'u1', connected: true },
      { text: 'trains', createdByUserId: 'u2', connected: false },
    ])
  })
})
