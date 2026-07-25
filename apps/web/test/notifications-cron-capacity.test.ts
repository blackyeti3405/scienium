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
  claimToken: string
  checkedAt: Date
  completedAt: Date | null
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

const computeNotifications = vi.fn((_input?: unknown) => [] as never[])
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
      // Models the claim ledger, not just a set of ids: the route now claims
      // BEFORE working and completes after, so "checked" and "claimed" are
      // different states and the mock has to tell them apart.
      findMany: async (args: {
        where: {
          runDay: Date
          teamId?: { in: string[] }
          claimToken?: string
          OR?: Array<{ completedAt?: { not: null }; checkedAt?: { gte: Date } }>
        }
      }) => {
        queryCount++
        const key = dayKey(args.where.runDay)
        return runLedger
          .filter((r) => r.runDay === key)
          .filter((r) => !args.where.teamId || args.where.teamId.in.includes(r.teamId))
          .filter((r) => args.where.claimToken === undefined || r.claimToken === args.where.claimToken)
          .filter((r) => {
            if (!args.where.OR) return true
            // Held = finished, or claimed within the lease.
            return args.where.OR.some((c) =>
              c.completedAt ? r.completedAt !== null : r.checkedAt >= c.checkedAt!.gte,
            )
          })
          .map((r) => ({ teamId: r.teamId }))
      },
      createMany: async (args: {
        data: Array<{ runDay: Date; teamId: string; claimToken: string }>
      }) => {
        queryCount++
        let count = 0
        for (const row of args.data) {
          const key = dayKey(row.runDay)
          if (runLedger.some((r) => r.runDay === key && r.teamId === row.teamId)) continue
          runLedger.push({
            runDay: key,
            teamId: row.teamId,
            claimToken: row.claimToken,
            checkedAt: new Date(),
            completedAt: null,
          })
          count++
        }
        return { count }
      },
      updateMany: async (args: {
        where: {
          runDay: Date
          teamId?: { in: string[] }
          claimToken?: string
          completedAt?: null
          checkedAt?: { lt: Date }
        }
        data: { claimToken?: string; checkedAt?: Date; completedAt?: Date }
      }) => {
        queryCount++
        const key = dayKey(args.where.runDay)
        let count = 0
        for (const r of runLedger) {
          if (r.runDay !== key) continue
          if (args.where.teamId && !args.where.teamId.in.includes(r.teamId)) continue
          if (args.where.claimToken !== undefined && r.claimToken !== args.where.claimToken) continue
          if (args.where.completedAt === null && r.completedAt !== null) continue
          if (args.where.checkedAt && !(r.checkedAt < args.where.checkedAt.lt)) continue
          if (args.data.claimToken !== undefined) r.claimToken = args.data.claimToken
          if (args.data.checkedAt !== undefined) r.checkedAt = args.data.checkedAt
          if (args.data.completedAt !== undefined) r.completedAt = args.data.completedAt
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
    notificationEmail: { createMany: async () => ({ count: 0 }) },
    notificationPref: { findMany: async () => [] },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        notification: { createMany: async () => ({ count: 0 }) },
        notificationEmail: { createMany: async () => ({ count: 0 }) },
      }),
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
    const done = runLedger.filter((r) => r.completedAt !== null)
    expect(done).toHaveLength(TEAM_COUNT)
    expect(new Set(done.map((r) => r.teamId)).size).toBe(TEAM_COUNT)
  })

  it('each run stays within a page-scaled query budget (never per-team reads)', async () => {
    queryCount = 0
    const out = await invoke()
    expect(out.teams).toBe(1000)
    expect(out.stoppedEarly).toBe(true)
    // ~11 pages x (teams read + log groupBy + claim insert + takeover + own
    // read + complete + release) + constant setup. The constant grew when
    // claim-before-work landed (P1-R5) — three page-scaled writes where there
    // used to be one. What must NOT change is the SCALING: per-team reads would
    // put this in the thousands.
    expect(queryCount).toBeLessThan(90)
    expect(queryCount).toBeLessThan(out.teams / 10)
  })

  it('zero-draft teams are still recorded as checked (no perpetual re-check)', async () => {
    await invoke()
    expect(computeNotifications).toHaveBeenCalled()
    // Every processed team produced zero drafts, yet all were recorded DONE.
    expect(runLedger.filter((r) => r.completedAt !== null)).toHaveLength(1000)
  })

  it('a failed team is not COMPLETED, and its claim is released for the next run', async () => {
    computeNotifications
      .mockImplementationOnce(() => {
        throw new Error('one team exploded')
      })
      .mockReturnValue([])
    const first = await invoke()
    expect(first.failedTeams).toBe(1)
    // Claim-before-work means the row now EXISTS for a failed team — what marks
    // it unfinished is `completedAt`, not the row's absence.
    expect(runLedger.filter((r) => r.completedAt !== null)).toHaveLength(999)

    // And it is RELEASED, not left to wait out the lease: a team we know failed
    // should be retried by the very next run, not five minutes later.
    const failed = runLedger.find((r) => r.completedAt === null)!
    expect(failed.checkedAt.getTime()).toBe(0)

    const second = await invoke()
    expect(second.teams).toBe(1000)
    expect(runLedger.filter((r) => r.completedAt !== null)).toHaveLength(1999)
  })

  it('two overlapping runs never process the same team twice (P1-R5)', async () => {
    // The whole point of claiming before working. Previously both runs read the
    // same unchecked roster, both processed, and both emailed — the notification
    // unique key stopped duplicate ROWS but not the duplicate send.
    const processedTeams: string[] = []
    computeNotifications.mockImplementation((input: unknown) => {
      processedTeams.push((input as { teamId: string }).teamId)
      return [] as never[]
    })

    await Promise.all([invoke(), invoke()])

    const seen = new Set(processedTeams)
    expect(processedTeams).toHaveLength(seen.size)
  })

  it('a claim held by a live run blocks a second run from taking the team', async () => {
    // In-flight claims (recent `checkedAt`, no completion) are respected. Only a
    // claim past its lease is treated as a crashed run's and taken over.
    runLedger.push({
      runDay: dayKey(new Date()),
      teamId: 'team_00001',
      claimToken: 'other-run',
      checkedAt: new Date(),
      completedAt: null,
    })
    const processedTeams: string[] = []
    computeNotifications.mockImplementation((input: unknown) => {
      processedTeams.push((input as { teamId: string }).teamId)
      return [] as never[]
    })

    await invoke()

    expect(processedTeams).not.toContain('team_00001')
  })
})
