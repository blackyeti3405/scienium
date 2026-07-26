import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * REFACTOR2 P1-R8 — team membership had no lifecycle.
 *
 * The failure that mattered was not untidy data. Teacher visibility is DERIVED
 * from `TeamMember`, so a membership nobody ever ended was a teacher who could
 * still open a team they no longer taught. Joining a second team left the first
 * membership live forever, and there was no leave, remove, or lead-transfer
 * command anywhere in the app to end one deliberately.
 *
 * Owner decisions encoded here (2026-07-26): one team at a time, and archive
 * rather than delete when the last member leaves.
 */

const store = {
  members: [] as { userId: string; teamId: string; role: 'lead' | 'member'; joinedAt: Date }[],
  teams: [] as { id: string; teamLeadId: string; archivedAt: Date | null }[],
  users: [] as { id: string; activeTeamId: string | null }[],
  invites: [] as { teamId: string; usedByUserId: string | null }[],
  events: [] as Record<string, unknown>[],
}

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db-lock', () => ({ lockAggregate: vi.fn(async () => {}) }))

const tx = {
  teamMember: {
    findUnique: async ({ where }: any) =>
      store.members.find(
        (m) => m.userId === where.userId_teamId.userId && m.teamId === where.userId_teamId.teamId,
      ) ?? null,
    findMany: async ({ where, orderBy }: any) => {
      let rows = store.members.filter((m) => {
        if (where.teamId && typeof where.teamId === 'string' && m.teamId !== where.teamId) return false
        if (where.teamId?.not && m.teamId === where.teamId.not) return false
        if (where.userId && m.userId !== where.userId) return false
        return true
      })
      if (orderBy?.joinedAt === 'asc') rows = [...rows].sort((a, b) => +a.joinedAt - +b.joinedAt)
      return rows
    },
    delete: async ({ where }: any) => {
      const i = store.members.findIndex(
        (m) => m.userId === where.userId_teamId.userId && m.teamId === where.userId_teamId.teamId,
      )
      store.members.splice(i, 1)
    },
    update: async ({ where, data }: any) => {
      const m = store.members.find(
        (x) => x.userId === where.userId_teamId.userId && x.teamId === where.userId_teamId.teamId,
      )!
      Object.assign(m, data)
    },
  },
  team: {
    findUnique: async ({ where }: any) => store.teams.find((t) => t.id === where.id) ?? null,
    update: async ({ where, data }: any) => {
      Object.assign(store.teams.find((t) => t.id === where.id)!, data)
    },
    updateMany: async ({ where, data }: any) => {
      const t = store.teams.find((x) => x.id === where.id && x.archivedAt === null)
      if (t) Object.assign(t, data)
      return { count: t ? 1 : 0 }
    },
  },
  teamInvite: {
    deleteMany: async ({ where }: any) => {
      const before = store.invites.length
      store.invites = store.invites.filter(
        (i) => !(i.teamId === where.teamId && i.usedByUserId === null),
      )
      return { count: before - store.invites.length }
    },
  },
  user: {
    updateMany: async ({ where, data }: any) => {
      const u = store.users.find((x) => x.id === where.id && x.activeTeamId === where.activeTeamId)
      if (u) Object.assign(u, data)
      return { count: u ? 1 : 0 }
    },
  },
  teamMembershipEvent: {
    create: async ({ data }: any) => {
      store.events.push(data)
      return data
    },
  },
}

vi.mock('@/lib/db', () => ({
  db: { $transaction: (fn: (t: unknown) => Promise<unknown>) => fn(tx) },
}))

import { departTeam, leaveOtherTeams, transferLead, MembershipError } from '@/lib/team/membership'

const T1 = 'team_1'
const T2 = 'team_2'

function seedTeam(id: string, leadId: string, memberIds: string[]) {
  store.teams.push({ id, teamLeadId: leadId, archivedAt: null })
  memberIds.forEach((userId, i) =>
    store.members.push({
      userId,
      teamId: id,
      role: userId === leadId ? 'lead' : 'member',
      joinedAt: new Date(2026, 0, i + 1),
    }),
  )
}

const eventsOfType = (event: string) => store.events.filter((e) => e.event === event)

beforeEach(() => {
  store.members = []
  store.teams = []
  store.users = []
  store.invites = []
  store.events = []
})

describe('one team at a time', () => {
  it('joining departs every other live membership', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])
    seedTeam(T2, 'u3', ['u3'])
    store.users.push({ id: 'u2', activeTeamId: T1 })

    const left = await leaveOtherTeams(tx as never, 'u2', T2)

    expect(left).toEqual([T1])
    // The stale membership is GONE, not flagged — teacher visibility is derived
    // from this table, so a row left behind is a live authorization leak.
    expect(store.members.filter((m) => m.userId === 'u2' && m.teamId === T1)).toHaveLength(0)
  })

  it('leaves the team being joined alone', async () => {
    seedTeam(T1, 'u1', ['u1'])
    await leaveOtherTeams(tx as never, 'u1', T1)
    expect(store.members).toHaveLength(1)
  })

  it('records the switch with an actor and a reason', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])
    await leaveOtherTeams(tx as never, 'u2', T2)

    expect(eventsOfType('left')[0]).toMatchObject({
      teamId: T1,
      userId: 'u2',
      actorUserId: 'u2',
      reason: 'switched_team',
    })
  })
})

describe('the final lead is protected', () => {
  it('hands the lead to the longest-standing remaining member', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2', 'u3'])

    await departTeam(tx as never, {
      teamId: T1,
      userId: 'u1',
      event: 'left',
      actorUserId: 'u1',
      reason: 'self_leave',
    })

    // u2 joined before u3.
    expect(store.teams[0]!.teamLeadId).toBe('u2')
    expect(store.members.find((m) => m.userId === 'u2')!.role).toBe('lead')
    // The system chose, so no human actor is credited.
    expect(eventsOfType('lead_transferred')[0]).toMatchObject({
      userId: 'u2',
      actorUserId: null,
      reason: 'previous_lead_departed',
    })
  })

  it('does not touch the lead when a non-lead leaves', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])

    await departTeam(tx as never, {
      teamId: T1,
      userId: 'u2',
      event: 'left',
      actorUserId: 'u2',
      reason: 'self_leave',
    })

    expect(store.teams[0]!.teamLeadId).toBe('u1')
    expect(eventsOfType('lead_transferred')).toHaveLength(0)
  })

  it('a departing lead is never refused — a team whose lead left must not be stuck', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])

    await expect(
      departTeam(tx as never, {
        teamId: T1,
        userId: 'u1',
        event: 'left',
        actorUserId: 'u1',
        reason: 'self_leave',
      }),
    ).resolves.toMatchObject({ newLeadUserId: 'u2' })
  })
})

describe('the last member archives the team', () => {
  it('archives rather than deleting — the work is the class’s product', async () => {
    seedTeam(T1, 'u1', ['u1'])
    store.users.push({ id: 'u1', activeTeamId: T1 })

    const result = await departTeam(tx as never, {
      teamId: T1,
      userId: 'u1',
      event: 'left',
      actorUserId: 'u1',
      reason: 'self_leave',
    })

    expect(result.archived).toBe(true)
    expect(store.teams[0]!.archivedAt).toBeInstanceOf(Date)
    // Still there — a student walking away must not destroy the team's papers,
    // showcase, or logs, and the teacher must still be able to see them.
    expect(store.teams).toHaveLength(1)
  })

  it('retires unused invites so an old code cannot resurrect an archived lab', async () => {
    seedTeam(T1, 'u1', ['u1'])
    store.invites.push({ teamId: T1, usedByUserId: null }, { teamId: T1, usedByUserId: 'u9' })

    await departTeam(tx as never, {
      teamId: T1,
      userId: 'u1',
      event: 'left',
      actorUserId: 'u1',
      reason: 'self_leave',
    })

    // The spent one stays as redemption history; the live one is gone.
    expect(store.invites).toEqual([{ teamId: T1, usedByUserId: 'u9' }])
  })

  it('does not archive while anyone remains', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])

    const result = await departTeam(tx as never, {
      teamId: T1,
      userId: 'u2',
      event: 'left',
      actorUserId: 'u2',
      reason: 'self_leave',
    })

    expect(result.archived).toBe(false)
    expect(store.teams[0]!.archivedAt).toBeNull()
  })
})

describe('activeTeamId never points at a team you left', () => {
  it('is cleared in the same transaction as the departure', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])
    store.users.push({ id: 'u2', activeTeamId: T1 })

    await departTeam(tx as never, {
      teamId: T1,
      userId: 'u2',
      event: 'left',
      actorUserId: 'u2',
      reason: 'self_leave',
    })

    expect(store.users[0]!.activeTeamId).toBeNull()
  })

  it('leaves a pointer at a DIFFERENT team alone', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])
    store.users.push({ id: 'u2', activeTeamId: T2 })

    await departTeam(tx as never, {
      teamId: T1,
      userId: 'u2',
      event: 'left',
      actorUserId: 'u2',
      reason: 'self_leave',
    })

    expect(store.users[0]!.activeTeamId).toBe(T2)
  })
})

describe('lead transfer', () => {
  it('moves the role and demotes the outgoing lead', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])

    await transferLead(tx as never, { teamId: T1, fromUserId: 'u1', toUserId: 'u2' })

    expect(store.teams[0]!.teamLeadId).toBe('u2')
    expect(store.members.find((m) => m.userId === 'u2')!.role).toBe('lead')
    expect(store.members.find((m) => m.userId === 'u1')!.role).toBe('member')
  })

  it('refuses a non-lead', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])
    await expect(
      transferLead(tx as never, { teamId: T1, fromUserId: 'u2', toUserId: 'u1' }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('refuses a target who is not on the team', async () => {
    seedTeam(T1, 'u1', ['u1'])
    await expect(
      transferLead(tx as never, { teamId: T1, fromUserId: 'u1', toUserId: 'stranger' }),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('refuses on an archived team', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])
    store.teams[0]!.archivedAt = new Date()
    await expect(
      transferLead(tx as never, { teamId: T1, fromUserId: 'u1', toUserId: 'u2' }),
    ).rejects.toMatchObject({ status: 409 })
  })
})

describe('departing a team you are not on', () => {
  it('is a 404, not a silent success', async () => {
    seedTeam(T1, 'u1', ['u1'])
    await expect(
      departTeam(tx as never, {
        teamId: T1,
        userId: 'stranger',
        event: 'left',
        actorUserId: 'stranger',
        reason: 'self_leave',
      }),
    ).rejects.toBeInstanceOf(MembershipError)
  })
})
