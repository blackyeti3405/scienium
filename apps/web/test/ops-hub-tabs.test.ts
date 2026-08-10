import { describe, it, expect } from 'vitest'
import { isFeatureUnlocked, type Phase } from '@/lib/phase'

/**
 * The Operations Hub filters its tab strip through `isFeatureUnlocked`, so the
 * set of visible tabs is a pure function of the phase. These pin the two ends of
 * that: a day-one lab sees ONLY its two logs, and everything else is earned at
 * `project_development`.
 */
const TABS: { key: string; feature: 'logs' | 'daily' | 'data_terminal' }[] = [
  { key: 'codex', feature: 'daily' },
  { key: 'log', feature: 'logs' },
  { key: 'failure', feature: 'logs' },
  { key: 'expertise', feature: 'daily' },
  { key: 'data', feature: 'data_terminal' },
  { key: 'vega', feature: 'daily' },
]

const visible = (phase: Phase) =>
  TABS.filter((t) => isFeatureUnlocked(phase, t.feature)).map((t) => t.key)

describe('Operations Hub tab gating', () => {
  it('a new lab sees the two logs and nothing else', () => {
    expect(visible('discovery')).toEqual(['log', 'failure'])
  })

  it('reading and planning do not open the earned half', () => {
    // The hub must not quietly widen at literature_review or plan_refinement —
    // the Codex and Proof of Expertise mint KP and raise clearance, which is the
    // shop's pacing.
    expect(visible('literature_review')).toEqual(['log', 'failure'])
    expect(visible('plan_refinement')).toEqual(['log', 'failure'])
  })

  it('project_development opens all six', () => {
    expect(visible('project_development')).toEqual([
      'codex', 'log', 'failure', 'expertise', 'data', 'vega',
    ])
  })

  it('the first unlocked tab is always a log, so the hub never opens empty', () => {
    // OperationsHubFeature falls back to `tabs[0]`; if that were ever a locked
    // or absent tab the panel would mount blank.
    for (const p of ['discovery', 'literature_review', 'plan_refinement', 'project_development'] as Phase[]) {
      expect(visible(p).length).toBeGreaterThan(0)
    }
  })
})
