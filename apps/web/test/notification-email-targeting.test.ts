import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * REFACTOR2 P2-S3 (the windows half) + §0.8 (the destination half).
 *
 * Two defects in one code path, both about WHO gets mail and WHY:
 *
 *  - `NotificationPref.deadlineDays` was stored, shown, and never read. The cron
 *    generated against a hard-coded `DEFAULT_DEADLINE_DAYS` and then emailed
 *    every opted-in member of the team, so a student who asked for exactly one
 *    reminder a week before the deadline got four, starting a month out.
 *  - The destination was any address the member typed. A student could point
 *    school reminder mail at a stranger; nothing tied it to a verified identity.
 *
 * The attack is a team whose members chose DIFFERENT windows: the run must
 * enqueue for the member whose window fired and for nobody else, at the address
 * Clerk verified for them.
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/cron/auth', () => ({ assertCron: () => null }))
vi.mock('@/lib/observability/log', () => ({ logEvent: vi.fn() }))
vi.mock('@/lib/notifications/email', () => ({
  emailConfigured: () => true,
  sendNotificationEmail: vi.fn(),
}))
vi.mock('@/lib/notifications/outbox', () => ({ deliverNotificationEmails: async () => 0 }))

/** Days from now that the fixture fair's registration deadline sits at. */
const deadlineIn = { days: 30 }

vi.mock('@/lib/fairs/match', () => ({
  loadFairIndex: async () => ({}),
  matchFairRowsFromIndex: () => ({
    regional: {
      id: 'fair_r',
      name: 'Regional Fair',
      events: [
        {
          id: 'event_r',
          eventDate: null,
          registrationDeadline: new Date(Date.now() + deadlineIn.days * 86_400_000),
          abstractDeadline: null,
        },
      ],
    },
    stateFair: null,
    isef: null,
  }),
}))

interface Member {
  teamId: string
  user: {
    email: string
    notificationPref: { emailEnabled: boolean; deadlineDays: number[] } | null
  }
}

let members: Member[]
let enqueued: Array<{ dedupeKey: string; recipient: string }>
let memberWhere: unknown

vi.mock('@/lib/db', () => ({
  db: {
    team: {
      findMany: async (args: { where: { id?: { gt: string } } }) =>
        args.where.id?.gt
          ? []
          : [{ id: 'team_1', locationState: 'CA', locationLat: null, locationLng: null }],
    },
    notificationRunTeam: {
      findMany: async (args: { where: { claimToken?: string } }) =>
        args.where.claimToken ? [{ teamId: 'team_1' }] : [],
      createMany: async () => ({ count: 1 }),
      updateMany: async () => ({ count: 0 }),
      deleteMany: async () => ({ count: 0 }),
    },
    projectLog: { groupBy: async () => [] },
    teamMember: {
      findMany: async (args: { where: unknown }) => {
        memberWhere = args.where
        return members
      },
    },
    notification: { findMany: async () => [] },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        notification: { createMany: async () => ({ count: 0 }) },
        notificationEmail: {
          createMany: async (args: {
            data: Array<{ dedupeKey: string; recipient: string }>
          }) => {
            enqueued.push(...args.data)
            return { count: args.data.length }
          },
        },
      }),
  },
}))

import { GET } from '@/app/api/cron/notifications/route'

const run = () => GET(new NextRequest('http://localhost:3000/api/cron/notifications'))

function member(email: string, deadlineDays: number[] | null, emailEnabled = true): Member {
  return {
    teamId: 'team_1',
    user: {
      email,
      notificationPref: deadlineDays === null ? null : { emailEnabled, deadlineDays },
    },
  }
}

beforeEach(() => {
  enqueued = []
  memberWhere = undefined
  deadlineIn.days = 30
})

describe('P2-S3 — reminder email is generated against each member\'s own windows', () => {
  it('a 30-day-out deadline mails only the member who asked for a 30-day window', async () => {
    members = [member('early@school.test', [30]), member('late@school.test', [7])]

    await run()

    expect(enqueued.map((e) => e.recipient)).toEqual(['early@school.test'])
  })

  it('…and the same fair mails the OTHER member when their own window fires', async () => {
    deadlineIn.days = 7
    members = [member('early@school.test', [30]), member('late@school.test', [7])]

    await run()

    expect(enqueued.map((e) => e.recipient)).toEqual(['late@school.test'])
  })

  it('a member who enabled mail but never customised windows keeps 30/14/7/1', async () => {
    members = [member('default@school.test', [30, 14, 7, 1])]

    await run()

    expect(enqueued.map((e) => e.recipient)).toEqual(['default@school.test'])
  })

  it('a member with no preferences at all is not mailed — email is opt-in', async () => {
    members = [member('nopref@school.test', null)]

    await run()

    expect(enqueued).toEqual([])
  })

  it('an opted-OUT member is never mailed, whatever their windows say', async () => {
    members = [member('optedout@school.test', [30], false)]

    await run()

    expect(enqueued).toEqual([])
  })

  it('the bell still carries every window any member chose', async () => {
    // The union is the point: a teammate's tighter window must not be dropped
    // just because it is not the reader's. At 7 days out, both members' brackets
    // have fired at some point, and the shared feed has to be able to say so.
    deadlineIn.days = 7
    members = [member('early@school.test', [30]), member('late@school.test', [7])]

    await run()

    expect(enqueued.map((e) => e.dedupeKey)).toEqual([
      'deadline:team_1:event_r:registration:7',
    ])
  })
})

describe('§0.8 — the destination is the Clerk-verified account address', () => {
  it('mails the account email, and never a member-supplied one', async () => {
    members = [member('verified@school.test', [30])]

    await run()

    expect(enqueued.map((e) => e.recipient)).toEqual(['verified@school.test'])
  })

  it('excludes an erased member, whose address is a non-routable tombstone', async () => {
    // Erasure blanks `User.email` to `deleted+<id>@invalid.scienium.app` and
    // stamps `deletedAt`. Mailing that address is a bounce per reminder per day.
    members = [member('anyone@school.test', [30])]

    await run()

    expect(memberWhere).toMatchObject({ user: { deletedAt: null } })
  })
})
