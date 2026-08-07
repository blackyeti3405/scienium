import { describe, it, expect } from 'vitest'
import {
  clampScore,
  clampScoreGain,
  computeQuizAward,
  computeRetryAggregate,
  computeClearanceRaise,
  evaluatePurchase,
  upgradeKpCost,
  upgradeLcCost,
  teamCostMultiplier,
  KP_PER_SOURCE_MAX,
  UPGRADE_COST_SLOPE,
} from '@/lib/economy'

describe('clampScore', () => {
  it('rounds and bounds to 0–100, NaN → 0', () => {
    expect(clampScore(NaN)).toBe(0)
    expect(clampScore(-5)).toBe(0)
    expect(clampScore(150)).toBe(100)
    expect(clampScore(84.6)).toBe(85)
  })
})

describe('computeQuizAward — KP high-water invariants', () => {
  // `priorKp`/`kpEarned` are KP (0–KP_PER_SOURCE_MAX); `aggregate`/`priorBest`
  // are 0–100 scores. Different units on purpose — raising the KP ceiling must
  // never rescale a stored score.
  it('a fresh pass awards the aggregate scaled to KP', () => {
    expect(computeQuizAward({ passed: true, aggregate: 80, priorKp: 0, priorBest: 0 })).toEqual({
      kpEarned: 400,
      newBestScore: 80,
      newKpAwarded: 400,
    })
  })

  it('a perfect score pays exactly the per-source ceiling', () => {
    const r = computeQuizAward({ passed: true, aggregate: 100, priorKp: 0, priorBest: 0 })
    expect(r.kpEarned).toBe(KP_PER_SOURCE_MAX)
    expect(r.newKpAwarded).toBe(KP_PER_SOURCE_MAX)
  })

  it('a failing quiz awards nothing and lowers no high-water', () => {
    expect(computeQuizAward({ passed: false, aggregate: 95, priorKp: 300, priorBest: 70 })).toEqual({
      kpEarned: 0,
      newBestScore: 70,
      newKpAwarded: 300,
    })
  })

  it('a passing retake tops up only by the improvement', () => {
    // Prior 70 → 350 KP banked; now 90 → 450 KP, so only 100 KP is owed.
    expect(computeQuizAward({ passed: true, aggregate: 90, priorKp: 350, priorBest: 70 })).toEqual({
      kpEarned: 100,
      newBestScore: 90,
      newKpAwarded: 450,
    })
  })

  it('a weaker passing retake grants nothing and never lowers the high-water', () => {
    const r = computeQuizAward({ passed: true, aggregate: 75, priorKp: 450, priorBest: 90 })
    expect(r.kpEarned).toBe(0)
    expect(r.newBestScore).toBe(90)
    expect(r.newKpAwarded).toBe(450)
  })

  it('INVARIANT: high-water never decreases across any sequence', () => {
    let kp = 0
    let best = 0
    const scores: Array<[boolean, number]> = [
      [true, 50], [false, 99], [true, 40], [true, 80], [true, 65], [true, 100], [true, 10],
    ]
    for (const [passed, aggregate] of scores) {
      const r = computeQuizAward({ passed, aggregate, priorKp: kp, priorBest: best })
      expect(r.newKpAwarded).toBeGreaterThanOrEqual(kp)
      expect(r.newBestScore).toBeGreaterThanOrEqual(best)
      expect(r.kpEarned).toBeGreaterThanOrEqual(0)
      kp = r.newKpAwarded
      best = r.newBestScore
    }
    expect(kp).toBe(KP_PER_SOURCE_MAX)
    expect(best).toBe(100)
  })

  it('total KP credited over retakes never exceeds the ceiling for one paper', () => {
    let kp = 0
    let best = 0
    let totalCredited = 0
    for (const aggregate of [40, 75, 60, 100, 100]) {
      const r = computeQuizAward({ passed: true, aggregate, priorKp: kp, priorBest: best })
      totalCredited += r.kpEarned
      kp = r.newKpAwarded
      best = r.newBestScore
    }
    expect(totalCredited).toBeLessThanOrEqual(KP_PER_SOURCE_MAX)
  })
})

describe('computeRetryAggregate — mean of current scores, flat-capped', () => {
  it('is the plain rounded mean when under the cap', () => {
    expect(computeRetryAggregate({ scores: [80, 90], threshold: 70, cap: 95 })).toEqual({
      aggregate: 85,
      passed: true,
    })
  })

  it('flat-caps a mean that would otherwise exceed the cap', () => {
    expect(computeRetryAggregate({ scores: [100, 100, 100], threshold: 70, cap: 95 })).toEqual({
      aggregate: 95,
      passed: true,
    })
  })

  it('a capped aggregate can still fail if it lands below threshold', () => {
    const r = computeRetryAggregate({ scores: [40, 50], threshold: 70, cap: 95 })
    expect(r.aggregate).toBe(45)
    expect(r.passed).toBe(false)
  })

  it('clamps out-of-range per-question scores before averaging', () => {
    expect(computeRetryAggregate({ scores: [150, -20, 100], threshold: 70, cap: 95 })).toEqual({
      // clamp(150)=100, clamp(-20)=0, clamp(100)=100 → mean 66.67 → round 67
      aggregate: 67,
      passed: false,
    })
  })

  it('a first-try 100 (no cap applied) is strictly better than any retried pass', () => {
    const retried = computeRetryAggregate({ scores: [100, 100, 100, 100, 100, 100], threshold: 70, cap: 95 })
    expect(retried.aggregate).toBeLessThan(100)
  })

  it('empty scores yields a 0 aggregate and does not pass', () => {
    expect(computeRetryAggregate({ scores: [], threshold: 70, cap: 95 })).toEqual({
      aggregate: 0,
      passed: false,
    })
  })
})

describe('computeClearanceRaise — clearance only rises', () => {
  it('a pass above current level raises and grants the bonus', () => {
    expect(computeClearanceRaise({ passed: true, targetLevel: 3, currentLevel: 2, levelKpBonus: 500 })).toEqual({
      raised: true,
      kpBonus: 500,
    })
  })

  it('a pass at or below current level does not raise (no double bonus)', () => {
    expect(computeClearanceRaise({ passed: true, targetLevel: 2, currentLevel: 2, levelKpBonus: 300 })).toEqual({
      raised: false,
      kpBonus: 0,
    })
    expect(computeClearanceRaise({ passed: true, targetLevel: 1, currentLevel: 4, levelKpBonus: 150 })).toEqual({
      raised: false,
      kpBonus: 0,
    })
  })

  it('a failing exam never raises', () => {
    expect(computeClearanceRaise({ passed: false, targetLevel: 5, currentLevel: 0, levelKpBonus: 1200 })).toEqual({
      raised: false,
      kpBonus: 0,
    })
  })
})

describe('clampScoreGain — anti-injection guard', () => {
  it('is a no-op at the default maxGain (100)', () => {
    expect(clampScoreGain(100, 0)).toBe(100)
    expect(clampScoreGain(72, 30)).toBe(72)
  })
  it('caps an implausible single-attempt jump when tightened', () => {
    expect(clampScoreGain(100, 20, 25)).toBe(45)
    expect(clampScoreGain(40, 20, 25)).toBe(40) // within the band, unchanged
  })
  it('never exceeds 100', () => {
    expect(clampScoreGain(100, 95, 50)).toBe(100)
  })
})

describe('teamCostMultiplier — the ONE formula shop-server, ShopPanel, and the plot hook now share', () => {
  it('never drops below 1, even for an empty/mid-transfer team', () => {
    expect(teamCostMultiplier(0)).toBe(1)
  })
  it('scales 1:1 with member count above 1', () => {
    expect(teamCostMultiplier(4)).toBe(4)
  })
})

describe('evaluatePurchase', () => {
  const building = { key: 'reagent_store', cost: 800, minClearance: 1 }
  const base = { owned: [] as string[], kp: 5000, clearanceLevel: 2, multiplier: 1 }

  it('applies the team-size multiplier to cost', () => {
    const r = evaluatePurchase({ ...base, multiplier: 3 }, building)
    expect(r.cost).toBe(2400)
    expect(r.ok).toBe(true)
  })
  it('rejects an already-owned building (409)', () => {
    const r = evaluatePurchase({ ...base, owned: ['reagent_store'] }, building)
    expect(r).toMatchObject({ ok: false, status: 409 })
  })
  it('rejects below the clearance ceiling (403)', () => {
    const r = evaluatePurchase({ ...base, clearanceLevel: 0 }, building)
    expect(r).toMatchObject({ ok: false, status: 403 })
  })
  it('rejects when KP is short, after the multiplier (402)', () => {
    const r = evaluatePurchase({ ...base, kp: 1000, multiplier: 2 }, building)
    expect(r).toMatchObject({ ok: false, status: 402, cost: 1600 })
  })
  it('checks owned before clearance before affordability', () => {
    // owned wins even when also under-clearance and broke
    const r = evaluatePurchase({ owned: ['reagent_store'], kp: 0, clearanceLevel: 0, multiplier: 1 }, building)
    expect(r).toMatchObject({ ok: false, status: 409 })
  })

  // Lab-type gate: a building restricted to a lab type is only buyable by a
  // matching team (defence-in-depth — the UI also hides it).
  const voltBuilding = { key: 'workshop', cost: 1000, minClearance: 0, labType: 'volt_lab' }

  it('rejects a lab-type-restricted building for a different lab (403)', () => {
    const r = evaluatePurchase({ ...base, labType: 'biocore' }, voltBuilding)
    expect(r).toMatchObject({ ok: false, status: 403 })
  })
  it('rejects a lab-type-restricted building when the team has no lab type yet (403)', () => {
    const r = evaluatePurchase({ ...base, labType: null }, voltBuilding)
    expect(r).toMatchObject({ ok: false, status: 403 })
  })
  it('allows a lab-type-restricted building for a matching lab', () => {
    expect(evaluatePurchase({ ...base, labType: 'volt_lab' }, voltBuilding).ok).toBe(true)
  })
  it('ignores the lab-type gate for unrestricted buildings', () => {
    // the universal `building` has no labType, so any team can buy it
    expect(evaluatePurchase({ ...base, labType: 'biocore' }, building).ok).toBe(true)
  })
  it('applies the lab-type gate before owned/clearance/affordability', () => {
    // wrong lab type wins even when also owned, under-clearance and broke
    const r = evaluatePurchase(
      { owned: ['workshop'], kp: 0, clearanceLevel: 0, multiplier: 1, labType: 'biocore' },
      voltBuilding,
    )
    expect(r).toMatchObject({ ok: false, status: 403 })
  })
})

describe('upgradeKpCost — round(base × UPGRADE_COST_SLOPE × (toLevel − 1))', () => {
  it('scales with base cost and target level', () => {
    expect(upgradeKpCost(1000, 2)).toBe(60)
    expect(upgradeKpCost(1000, 4)).toBe(180)
    expect(upgradeKpCost(1000, 8)).toBe(420)
    expect(upgradeKpCost(1000, 15)).toBe(840)
    // premium building (higher base) costs proportionally more
    expect(upgradeKpCost(4000, 4)).toBe(720)
  })

  it('a full L1→L15 climb stays within reach of a term of play', () => {
    // The old 0.25 slope summed to base × 26.25 — 472,500 KP for one premium
    // building, which is why nothing was ever levelled.
    const total = Array.from({ length: 14 }, (_, i) => upgradeKpCost(4000, i + 2)).reduce(
      (a, b) => a + b,
      0,
    )
    expect(total).toBe(Math.round(4000 * UPGRADE_COST_SLOPE * 105))
    expect(total).toBeLessThan(30_000)
  })
})

describe('upgradeLcCost — LC only at tier-up levels 4/7/10/15', () => {
  it('charges LC only on the four tier transitions', () => {
    expect(upgradeLcCost(4)).toBe(2)
    expect(upgradeLcCost(7)).toBe(4)
    expect(upgradeLcCost(10)).toBe(6)
    expect(upgradeLcCost(15)).toBe(10)
  })

  it('charges 0 LC on every non-tier upgrade', () => {
    for (const l of [2, 3, 5, 6, 8, 9, 11, 12, 13, 14]) {
      expect(upgradeLcCost(l)).toBe(0)
    }
  })

  it('sum of LC across the full 1→15 climb equals 22', () => {
    let total = 0
    for (let l = 2; l <= 15; l++) total += upgradeLcCost(l)
    expect(total).toBe(22)
  })
})
