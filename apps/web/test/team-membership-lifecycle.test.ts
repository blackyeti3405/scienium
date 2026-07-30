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
  teams: [] as { id: string; name: string; teamLeadId: string; archivedAt: Date | null }[],
  users: [] as { id: string; activeTeamId: string | null }[],
  invites: [] as { teamId: string; usedByUserId: string | null }[],
  events: [] as Record<string, unknown>[],
  notifications: [] as Record<string, unknown>[],
  securityEvents: [] as Record<string, unknown>[],
}
let eventSeq = 0

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
    updateMany: async ({ where, data }: any) => {
      const rows = store.members.filter(
        (m) =>
          (where.teamId === undefined || m.teamId === where.teamId) &&
          (where.userId === undefined || m.userId === where.userId) &&
          (where.role === undefined || m.role === where.role),
      )
      for (const m of rows) Object.assign(m, data)
      return { count: rows.length }
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
      const row = { id: `evt_${++eventSeq}`, ...data }
      store.events.push(row)
      return row
    },
  },
  // The cross-surface ledger written alongside every lifecycle event
  // (REFACTOR2 P1-5) — captured so the assertions below can read it.
  securityEvent: {
    create: async ({ data }: any) => {
      const row = { id: `sec_${++eventSeq}`, ...data }
      store.securityEvents.push(row)
      return row
    },
  },
  notification: {
    create: async ({ data }: any) => {
      if (store.notifications.some((n) => n.dedupeKey === data.dedupeKey)) {
        // `dedupeKey` is `@unique`, and the write is inside the removal's
        // transaction — a collision does not lose a notice, it rolls the
        // removal back.
        throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
      }
      store.notifications.push(data)
      return data
    },
  },
}

vi.mock('@/lib/db', () => ({
  db: { $transaction: (fn: (t: unknown) => Promise<unknown>) => fn(tx) },
}))

import {
  departTeam,
  leaveOtherTeams,
  transferLead,
  reassignLeadAsTeacher,
  MembershipError,
} from '@/lib/team/membership'

const T1 = 'team_1'
const T2 = 'team_2'

function seedTeam(id: string, leadId: string, memberIds: string[]) {
  store.teams.push({ id, name: `Lab ${id}`, teamLeadId: leadId, archivedAt: null })
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
  store.notifications = []
  store.securityEvents = []
  eventSeq = 0
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

/**
 * The capability P1-R8 named and left unbuilt: a lead who stops showing up
 * leaves their team unable to remove members, hand over, or manage invites, and
 * the only remedy was for that lead to act.
 *
 * The load-bearing part is that this authorizes on OWNERSHIP, never on being the
 * lead — so the two must not be able to stand in for one another.
 */
describe('teacher-initiated lead reassignment', () => {
  it('moves the role without the outgoing lead acting', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])

    const out = await reassignLeadAsTeacher({
      teamId: T1,
      toUserId: 'u2',
      actorUserId: 'teacher_1',
      ownsTeam: true,
    })

    expect(out.previousLeadUserId).toBe('u1')
    expect(store.teams[0]!.teamLeadId).toBe('u2')
    expect(store.members.find((m) => m.userId === 'u2')!.role).toBe('lead')
    expect(store.members.find((m) => m.userId === 'u1')!.role).toBe('member')
    expect(store.events.at(-1)).toMatchObject({
      event: 'lead_transferred',
      actorUserId: 'teacher_1',
      reason: 'reassigned_by_teacher',
    })
  })

  it('a teacher who does not own the team gets the same 404 as a missing one', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])
    await expect(
      reassignLeadAsTeacher({ teamId: T1, toUserId: 'u2', actorUserId: 'teacher_1', ownsTeam: false }),
    ).rejects.toMatchObject({ status: 404 })
    // NEGATIVE CONTROL: the refusal is the only reason nothing moved.
    expect(store.teams[0]!.teamLeadId).toBe('u1')
    expect(store.events).toHaveLength(0)
  })

  it('refuses a target who is not on the team', async () => {
    seedTeam(T1, 'u1', ['u1'])
    await expect(
      reassignLeadAsTeacher({
        teamId: T1,
        toUserId: 'stranger',
        actorUserId: 'teacher_1',
        ownsTeam: true,
      }),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('refuses when the target already leads', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])
    await expect(
      reassignLeadAsTeacher({ teamId: T1, toUserId: 'u1', actorUserId: 'teacher_1', ownsTeam: true }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('refuses on an archived team', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])
    store.teams[0]!.archivedAt = new Date()
    await expect(
      reassignLeadAsTeacher({ teamId: T1, toUserId: 'u2', actorUserId: 'teacher_1', ownsTeam: true }),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('still promotes when the outgoing lead has no membership row left', async () => {
    // `Team.teamLeadId` can point at someone already departed. Demoting through
    // `update` would throw here and take the whole reassignment down.
    seedTeam(T1, 'ghost', ['u2'])

    await reassignLeadAsTeacher({
      teamId: T1,
      toUserId: 'u2',
      actorUserId: 'teacher_1',
      ownsTeam: true,
    })

    expect(store.teams[0]!.teamLeadId).toBe('u2')
    expect(store.members.find((m) => m.userId === 'u2')!.role).toBe('lead')
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

describe('a removed member is told (HANDOFF #5)', () => {
  const remove = (userId: string) =>
    departTeam(tx as never, {
      teamId: T1,
      userId,
      event: 'removed',
      actorUserId: 'u1',
      reason: 'removed_by_lead',
    })

  it('writes the notice addressed to the removed member alone', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])

    await remove('u2')

    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0]).toMatchObject({
      teamId: T1,
      userId: 'u2',
      kind: 'membership_changed',
      title: `You were removed from Lab ${T1}`,
      linkUrl: '/onboarding',
    })
  })

  it('a member who LEFT is not notified — they know', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])

    await departTeam(tx as never, {
      teamId: T1,
      userId: 'u2',
      event: 'left',
      actorUserId: 'u2',
      reason: 'self_leave',
    })

    expect(store.notifications).toEqual([])
  })

  it('switching teams does not notify — the join did it, nobody removed them', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])
    seedTeam(T2, 'u3', ['u3'])

    await leaveOtherTeams(tx as never, 'u2', T2)

    expect(store.notifications).toEqual([])
  })

  it('keys the notice to the EVENT, so re-joining and being removed again works', async () => {
    // A key of (user, team) collides on the second removal — and because the
    // write is inside the removal's transaction, that collision aborts the
    // REMOVAL. The member would be stuck on a team they were removed from.
    seedTeam(T1, 'u1', ['u1', 'u2'])
    await remove('u2')
    store.members.push({ userId: 'u2', teamId: T1, role: 'member', joinedAt: new Date(2026, 0, 5) })

    await expect(remove('u2')).resolves.toBeTruthy()
    expect(store.notifications).toHaveLength(2)
    expect(store.notifications[0]!.dedupeKey).not.toBe(store.notifications[1]!.dedupeKey)
  })
})

describe('a system removal is not a notice', () => {
  it('erasure departs a membership with no actor and writes no notification', async () => {
    // `lib/data-requests/workflow.ts` departs live memberships with
    // `event: 'removed', actorUserId: null` so the lead handover and archiving
    // still happen. Telling a student their lab membership ended, inside the
    // transaction that is erasing them, is noise — and the notice would be
    // deleted by the same transaction seconds later.
    seedTeam(T1, 'u1', ['u1', 'u2'])

    await departTeam(tx as never, {
      teamId: T1,
      userId: 'u2',
      event: 'removed',
      actorUserId: null,
      reason: 'data_erasure',
    })

    expect(store.notifications).toEqual([])
    expect(eventsOfType('removed')).toHaveLength(1) // the log still records it
  })
})

describe('P1-5 — every lifecycle change lands in the security ledger', () => {
  /**
   * `TeamMembershipEvent` is the team's own history. The security ledger is the
   * cross-surface one an operator queries without knowing which of six
   * per-domain tables to join — and, unlike `TeamMembershipEvent`, it carries no
   * foreign key, so a team teardown cannot take it with it.
   *
   * These assert against the SINGLE append point (`record`), which is why a
   * lifecycle transition added later inherits the ledger row instead of needing
   * to remember one.
   */
  it('a removal is recorded with actor, target, team and a bounded reason', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])

    await departTeam(tx as never, {
      teamId: T1,
      userId: 'u2',
      event: 'removed',
      actorUserId: 'u1',
      reason: 'removed_by_lead',
    })

    expect(store.securityEvents).toContainEqual(
      expect.objectContaining({
        kind: 'authority.membership',
        outcome: 'ok',
        actorType: 'user',
        actorUserId: 'u1',
        targetType: 'team_member',
        targetId: 'u2',
        scopeId: T1,
        reason: 'removed:removed_by_lead',
      }),
    )
  })

  it('a lead transfer is a ROLE change, not a membership change', async () => {
    // The two are separated in the ledger because they are separate questions:
    // "who is in this lab" and "who runs it" are investigated differently.
    seedTeam(T1, 'u1', ['u1', 'u2'])

    await transferLead(tx as never, { teamId: T1, fromUserId: 'u1', toUserId: 'u2' })

    const roleRows = store.securityEvents.filter((e) => e.kind === 'authority.role_changed')
    expect(roleRows).toHaveLength(1)
    expect(roleRows[0]).toMatchObject({
      actorUserId: 'u1',
      targetId: 'u2',
      scopeId: T1,
      reason: 'lead_transferred:handed_over',
    })
  })

  it('a system-chosen transfer is recorded as system, never credited to a person', async () => {
    seedTeam(T1, 'u1', ['u1', 'u2'])

    await departTeam(tx as never, {
      teamId: T1,
      userId: 'u1',
      event: 'left',
      actorUserId: 'u1',
      reason: 'self_leave',
    })

    const auto = store.securityEvents.find((e) => e.reason === 'lead_transferred:previous_lead_departed')
    expect(auto).toMatchObject({ actorType: 'system', actorUserId: null, targetId: 'u2' })
  })
})
