import { describe, it, expect } from 'vitest'
import {
  DISCOVERY_VISIT_KP,
  DISCOVERY_DAILY_KP_CAP,
  TOPIC_LOCK_KP,
  visitKp,
  clampToDailyCap,
} from '@/lib/discovery/economy'

describe('visitKp — base × tier multiplier', () => {
  it('wiki/youtube (no tier) award the base', () => {
    expect(visitKp(null)).toBe(DISCOVERY_VISIT_KP)
    expect(visitKp(undefined)).toBe(DISCOVERY_VISIT_KP)
  })

  it('peer-reviewed earns 3× the base', () => {
    expect(visitKp('peer_reviewed')).toBe(DISCOVERY_VISIT_KP * 3)
    expect(visitKp('peer_reviewed')).toBe(15)
  })

  it('preprint + open_access earn 2× the base', () => {
    expect(visitKp('preprint')).toBe(DISCOVERY_VISIT_KP * 2)
    expect(visitKp('open_access')).toBe(DISCOVERY_VISIT_KP * 2)
    expect(visitKp('preprint')).toBe(10)
  })

  it('peer-reviewed > preprint (tier scaling is monotone)', () => {
    expect(visitKp('peer_reviewed')).toBeGreaterThan(visitKp('preprint'))
  })
})

describe('clampToDailyCap — daily headroom clamp', () => {
  it('full award when well under the cap', () => {
    expect(clampToDailyCap(15, 0)).toBe(15)
    expect(clampToDailyCap(5, 20)).toBe(5)
  })

  it('exactly at the cap awards 0', () => {
    expect(clampToDailyCap(5, DISCOVERY_DAILY_KP_CAP)).toBe(0)
  })

  it('partially over the cap awards only the remaining headroom', () => {
    expect(clampToDailyCap(15, DISCOVERY_DAILY_KP_CAP - 10)).toBe(10)
  })

  it('already over the cap awards 0 (never negative)', () => {
    expect(clampToDailyCap(15, DISCOVERY_DAILY_KP_CAP + 100)).toBe(0)
  })

  it('respects a custom cap argument', () => {
    expect(clampToDailyCap(10, 5, 12)).toBe(7)
    expect(clampToDailyCap(10, 12, 12)).toBe(0)
  })
})

describe('TOPIC_LOCK_KP is the documented one-time bonus', () => {
  it('equals 25', () => {
    expect(TOPIC_LOCK_KP).toBe(25)
  })
})
