import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * A4 — one production day of the notification cron must COVER a 10,000-user
 * population (~3,500 teams at the default 3-member size), and coverage must be
 * durable: every checked team gets a `NotificationRunTeam` row for the day,
 * zero-draft teams included, failed teams excluded (so they retry).
 *
 * The production schedule fires the route every 15 minutes across a morning
 * window (20 invocations); each invocation handles at most MAX_TEAMS_PER_RUN.
 * This test simulates that day against an in-memory store and also asserts a
 * per-run QUERY BUDGET — the run's DB work must scale with pages (~100 teams
 * per query), not with teams, or 3,500 teams × per-team reads would blow the
 * serverless time budget.
 */

const TEAM_COUNT = 3_500

interface RunTeamRow {
  runDay: string
  teamId: string
}

let teams: Array<{ id: string; locationState: string; locationLat: number | null; locationLng: number | null }>
let runLedger: RunTeamRow[]
let queryCount: number

const dayKey = (d: Date) => d.toISOString().slice(0, 10)

vi.mock('@/lib/cron/auth', () => ({ assertCron: () => null }))
vi.mock('@/lib/observability/log', () => ({ logEvent: vi.fn() }))
vi.mock('@/lib/notifications/email', () => ({
  emailConfigured: () => false,
  sendNotificationEmail: vi.fn(),
}))
vi.mock('@/lib/fairs/match', () => ({
  loadFairIndex: async () => {
    queryCount++ // stands in for the single fair-table load
    return {}
  },
  matchFairRowsFromIndex: () => ({
    regional: {
      id: 'fair_r',
      name: 'Regional Fair',
      events: [
        {
          id: 'event_r',
          eventDate: new Date('2026-09-01'),
          registrationDeadline: new Date('2026-08-15'),
          abstractDeadline: null,
        },
      ],
    },
    stateFair: null,
    isef: null,
  }),
}))

const computeNotifications = vi.fn(() => [] as never[])
vi.mock('@/lib/notifications/compute', () => ({
  computeNotifications: (...args: unknown[]) => computeNotifications(...(args as [])),
}))

vi.mock('@/lib/db', () => ({
  db: {
    team: {
      findMany: async (args: {
        where: { id?: { gt: string } }
        orderBy: unknown
        take: number
      }) => {
        queryCount++
        const after = args.where.id?.gt
        return teams
          .filter((t) => (after ? t.id > after : true))
          .sort((a, b) => (a.id < b.id ? -1 : 1))
          .slice(0, args.take)
      },
    },
    notificationRunTeam: {
      findMany: async (args: { where: { runDay: Date } }) => {
        queryCount++
        const key = dayKey(args.where.runDay)
        return runLedger.filter((r) => r.runDay === key).map((r) => ({ teamId: r.teamId }))
      },
      createMany: async (args: { data: Array<{ runDay: Date; teamId: string }> }) => {
        queryCount++
        let count = 0
        for (const row of args.data) {
          const key = dayKey(row.runDay)
          if (runLedger.some((r) => r.runDay === key && r.teamId === row.teamId)) continue
          runLedger.push({ runDay: key, teamId: row.teamId })
          count++
        }
        return { count }
      },
      deleteMany: async (args: { where: { runDay: { lt: Date } } }) => {
        queryCount++
        const cutoff = dayKey(args.where.runDay.lt)
        const keep = runLedger.filter((r) => r.runDay >= cutoff)
        const count = runLedger.length - keep.length
        runLedger = keep
        return { count }
      },
    },
    projectLog: {
      groupBy: async () => {
        queryCount++
        return []
      },
    },
    notification: {
      findMany: async () => {
        queryCount++
        return []
      },
      createMany: async () => {
        queryCount++
        return { count: 0 }
      },
    },
  },
}))

import { GET } from '@/app/api/cron/notifications/route'

const invoke = async () => {
  const res = await GET(new NextRequest('http://localhost:3000/api/cron/notifications'))
  return (await res.json()) as {
    teams: number
    created: number
    failedTeams: number
    skippedDone: number
    stoppedEarly: boolean
  }
}

beforeEach(() => {
  teams = Array.from({ length: TEAM_COUNT }, (_, i) => ({
    id: `team_${String(i + 1).padStart(5, '0')}`,
    locationState: 'CA',
    locationLat: null,
    locationLng: null,
  }))
  runLedger = []
  queryCount = 0
  computeNotifications.mockReset()
  computeNotifications.mockReturnValue([])
})

describe('notification cron daily capacity (A4)', () => {
  it('covers all 3,500 teams durably within one scheduled day (≤20 runs)', async () => {
    let runs = 0
    while (runs < 20) {
      runs++
      const out = await invoke()
      if (out.teams === 0 && !out.stoppedEarly) break
    }
    // 4 working runs (1000+1000+1000+500) + 1 confirming empty run.
    expect(runs).toBe(5)
    expect(runLedger).toHaveLength(TEAM_COUNT)
    expect(new Set(runLedger.map((r) => r.teamId)).size).toBe(TEAM_COUNT)
  })

  it('each run stays within a page-scaled query budget (never per-team reads)', async () => {
    queryCount = 0
    const out = await invoke()
    expect(out.teams).toBe(1000)
    expect(out.stoppedEarly).toBe(true)
    // ~11 pages × (teams read + log groupBy + ledger write) + constant setup.
    // Per-team fair/event/log reads would put this in the thousands.
    expect(queryCount).toBeLessThan(60)
  })

  it('zero-draft teams are still recorded as checked (no perpetual re-check)', async () => {
    await invoke()
    expect(computeNotifications).toHaveBeenCalled()
    // Every processed team produced zero drafts, yet all were recorded.
    expect(runLedger).toHaveLength(1000)
  })

  it('a failed team is NOT recorded and is retried by the next run', async () => {
    computeNotifications
      .mockImplementationOnce(() => {
        throw new Error('one team exploded')
      })
      .mockReturnValue([])
    const first = await invoke()
    expect(first.failedTeams).toBe(1)
    expect(runLedger).toHaveLength(999)

    const second = await invoke()
    // The retried team plus the next 999 unchecked ones.
    expect(second.teams).toBe(1000)
    expect(runLedger).toHaveLength(1999)
  })
})
