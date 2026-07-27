import { describe, expect, it, vi } from 'vitest'

/**
 * REFACTOR2 P1-R5 — activity logging had no durability contract.
 *
 * One function named `logActivity` served both "a teacher may need this as
 * evidence a student did the work" and "nice-to-have feed noise", and swallowed
 * every failure at 28 of 29 call sites. The split is the contract: the durable
 * one writes in the caller's transaction and THROWS, so the record and the thing
 * it records cannot land separately; the best-effort one says so in its name.
 */

vi.mock('server-only', () => ({}))
const { create } = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('@/lib/db', () => ({ db: { activityFeed: { create } } }))

import {
  DURABLE_ACTIVITY_ACTIONS,
  logActivityBestEffort,
  recordActivity,
  type ActivityAction,
} from '@/lib/activity/log'

describe('recordActivity — the durable half', () => {
  it('writes through the transaction it was handed, not the global client', async () => {
    const txCreate = vi.fn().mockResolvedValue({})
    await recordActivity({ activityFeed: { create: txCreate } }, 't1', 'u1', 'quiz_passed', {
      score: 90,
    })

    expect(txCreate).toHaveBeenCalledOnce()
    // Writing via the global client would commit independently of the caller's
    // transaction, which is the whole failure this replaces.
    expect(create).not.toHaveBeenCalled()
    expect(txCreate.mock.calls[0]![0].data).toMatchObject({
      teamId: 't1',
      userId: 'u1',
      actionType: 'quiz_passed',
    })
  })

  it('THROWS, so a failed record rolls the caller back', async () => {
    const txCreate = vi.fn().mockRejectedValue(new Error('feed write failed'))

    await expect(
      recordActivity({ activityFeed: { create: txCreate } }, 't1', 'u1', 'quiz_passed', {}),
    ).rejects.toThrow('feed write failed')
    // If this ever starts swallowing, KP can move with no evidence it moved.
  })
})

describe('logActivityBestEffort — the explicitly optional half', () => {
  it('swallows failures so ambient telemetry cannot break a request', async () => {
    create.mockRejectedValueOnce(new Error('db down'))
    await expect(logActivityBestEffort('t1', 'u1', 'plan_synced', {})).resolves.toBeUndefined()
  })
})

describe('which actions are durable', () => {
  it('every progression and teacher-history action is classified durable', () => {
    const mustBeDurable: ActivityAction[] = [
      'quiz_passed',
      'explanation_passed',
      'codex_lesson_completed',
      'clearance_raised',
      'phase_advanced',
      'showcase_published',
      'member_joined',
      'topic_locked',
      'discovery_kp_awarded',
      'building_purchased',
      'building_sold',
      'building_upgraded',
    ]
    for (const a of mustBeDurable) {
      expect(DURABLE_ACTIVITY_ACTIONS.has(a), `${a} should be durable`).toBe(true)
    }
  })

  it('pure feed noise is not classified durable', () => {
    for (const a of ['plan_synced', 'log_edited', 'paper_upload'] as ActivityAction[]) {
      expect(DURABLE_ACTIVITY_ACTIONS.has(a), `${a} should not be durable`).toBe(false)
    }
  })
})

describe('migration status — honest about what is still best-effort', () => {
  it('lists the durable actions still written outside a transaction', async () => {
    const { readFileSync, readdirSync, statSync } = await import('node:fs')
    const { join, relative } = await import('node:path')
    const root = join(__dirname, '..')
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((e) => {
        const p = join(d, e)
        return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : []
      })

    const remaining: string[] = []
    for (const p of [...walk(join(root, 'app')), ...walk(join(root, 'lib'))]) {
      if (p.endsWith('.test.ts') || p.endsWith('lib/activity/log.ts')) continue
      const src = readFileSync(p, 'utf8')
      for (const m of src.matchAll(/logActivityBestEffort\(\s*[^,]+,\s*[^,]+,\s*'([a-z_]+)'/g)) {
        if (DURABLE_ACTIVITY_ACTIONS.has(m[1] as ActivityAction)) {
          remaining.push(`${relative(root, p)}:${m[1]}`)
        }
      }
    }

    // v0.72.0 migrated all 11 formerly-remaining durable-class events into
    // their domain transaction via `recordActivity`. The list is asserted
    // EXACTLY (now empty) so it can only shrink on purpose — a new
    // best-effort write of a durable-class action fails this test immediately.
    expect(remaining.sort()).toEqual([])
  })
})
