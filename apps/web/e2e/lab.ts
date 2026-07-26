import { e2eDb } from './db'

/**
 * A disposable lab per spec file — the fix for the suite's biggest flake source.
 *
 * ## The problem this replaces
 *
 * Every spec authenticates as the same leader on the ONE shared "E2E Test Lab"
 * and mutates it. The seeder never deletes, so that lab accumulates: after
 * months of runs it held 1,732 activity-feed rows, 152 notifications, 49 project
 * logs and 123 uploaded assets that no spec put there on purpose. Specs coped by
 * growing private `deleteMany` calls in `beforeAll` — which made one spec's
 * cleanup the next spec's missing precondition, and made `mode: 'serial'`
 * mandatory in 23 of 32 files. A single failure then cascades: the rest of the
 * file reports "did not run", so one broken assertion hides a dozen others.
 *
 * ## What this gives instead
 *
 * `withLab()` creates a fresh team owned by the E2E leader, points their
 * `activeTeamId` at it for the duration, and purges it afterwards through the
 * SAME ordered inventory `reset:e2e` uses. A spec that uses it starts from a
 * known-empty lab every run and leaves nothing behind, so it neither depends on
 * nor damages its neighbours.
 *
 * ## What it does not give (yet)
 *
 * Parallelism. `User.activeTeamId` is singular, so one signed-in account can own
 * one active lab at a time and the suite still runs with one worker. Making the
 * suite parallel needs one Clerk account per worker; this is the half of that
 * change that does not need new accounts, and it is the half that removes the
 * flakes. See `docs/runbooks/e2e.md`.
 */

/** Matches the seeder's fixture so feature gating behaves identically. */
const FIXTURE_PHASE = 'showcase'
const FIXTURE_LAB_TYPE = 'volt_lab'
const KP_BASELINE = 100_000
const CLEARANCE_BASELINE = 3

export interface Lab {
  teamId: string
  leaderUserId: string
  /** The class the leader belongs to, so teacher-scope specs still resolve. */
  classId: string | null
}

interface Anchor {
  leaderUserId: string
  classId: string | null
  previousActiveTeamId: string | null
}

async function resolveAnchor(): Promise<Anchor> {
  const shared = await e2eDb.team.findFirst({
    where: { name: 'E2E Test Lab' },
    select: { id: true, teamLeadId: true },
  })
  if (!shared) {
    throw new Error("No 'E2E Test Lab' fixture — run: pnpm --filter web seed:e2e")
  }
  const leader = await e2eDb.user.findUnique({
    where: { id: shared.teamLeadId },
    select: { id: true, classId: true, activeTeamId: true },
  })
  if (!leader) throw new Error('The fixture team has no lead user — run: pnpm --filter web seed:e2e')
  return {
    leaderUserId: leader.id,
    classId: leader.classId,
    previousActiveTeamId: leader.activeTeamId ?? shared.id,
  }
}

export interface OwnedLab extends Lab {
  /** Restore the previous active team and purge this lab. Safe to call twice. */
  dispose(): Promise<void>
}

/**
 * Create a lab that exists only for this spec file.
 *
 * The `beforeAll` / `afterAll` shape Playwright specs actually use:
 *
 *   let lab: OwnedLab
 *   test.beforeAll(async () => { lab = await createLab('synthesis') })
 *   test.afterAll(async () => { await lab.dispose() })
 *
 * Named `[E2E <label>]` so `reset:e2e` sweeps it as a stray if a crash prevents
 * disposal — the cleanup path has to survive the failures it exists for.
 *
 * `activeTeamId` is only repointed when `claimActive` is true (the default).
 * A second, "foreign" lab for an IDOR case must NOT steal the active team.
 */
export async function createLab(label: string, claimActive = true): Promise<OwnedLab> {
  const anchor = await resolveAnchor()
  const team = await e2eDb.team.create({
    data: {
      name: `[E2E ${label}]`,
      teamLeadId: anchor.leaderUserId,
      classId: anchor.classId,
      phase: FIXTURE_PHASE,
      labType: FIXTURE_LAB_TYPE,
      members: { create: { userId: anchor.leaderUserId, role: 'lead' } },
      currency: { create: { kp: KP_BASELINE, clearanceLevel: CLEARANCE_BASELINE } },
    },
    select: { id: true },
  })
  // The app resolves the active team through membership, so this is what makes
  // the signed-in leader's requests land on the disposable lab.
  if (claimActive) {
    await e2eDb.user.update({ where: { id: anchor.leaderUserId }, data: { activeTeamId: team.id } })
  }

  let disposed = false
  return {
    teamId: team.id,
    leaderUserId: anchor.leaderUserId,
    classId: anchor.classId,
    async dispose() {
      if (disposed) return
      disposed = true
      // Restore FIRST: a failed delete must not strand the account pointing at a
      // lab that is on its way out.
      if (claimActive) {
        await e2eDb.user
          .update({
            where: { id: anchor.leaderUserId },
            data: { activeTeamId: anchor.previousActiveTeamId },
          })
          .catch(() => {})
      }
      await disposeLab(team.id)
    },
  }
}

/** Callback form of {@link createLab}, for a one-off block. */
export async function withLab<T>(label: string, fn: (lab: Lab) => Promise<T>): Promise<T> {
  const lab = await createLab(label)
  try {
    return await fn(lab)
  } finally {
    await lab.dispose()
  }
}

/**
 * Purge and delete one disposable lab.
 *
 * The purge reuses `prisma/reset-e2e.mjs` rather than repeating its ordered
 * delete list — two copies of "what belongs to a team" drift, and the drift
 * surfaces as a foreign-key error in teardown, which is the worst place for one.
 */
export async function disposeLab(teamId: string): Promise<void> {
  // A runtime import: the inventory lives in the .mjs script that also backs the
  // `reset:e2e` CLI, so both paths share one owner.
  const { purgeTeam } = (await import('../prisma/reset-e2e.mjs')) as unknown as {
    purgeTeam: (db: typeof e2eDb, teamId: string) => Promise<Record<string, number>>
  }
  await purgeTeam(e2eDb, teamId)

  // `uploaded_assets.team_id` is ON DELETE RESTRICT (P1-R12): the ledger row is
  // the only record that an R2 object exists, so deleting the team while rows
  // remain is refused — correctly. Deleting the rows instead would strand the
  // objects permanently in a bucket shared with production. So any asset this
  // lab created is REASSIGNED to the shared fixture team, still `orphaned`: the
  // object stays tracked and the normal reclaim sweep retires it, while the
  // disposable lab becomes deletable.
  const shared = await e2eDb.team.findFirst({
    where: { name: 'E2E Test Lab' },
    select: { id: true },
  })
  if (shared) {
    await e2eDb.uploadedAsset.updateMany({
      where: { teamId },
      data: { teamId: shared.id, status: 'orphaned' },
    })
  }

  await e2eDb.teamMember.deleteMany({ where: { teamId } })
  await e2eDb.teamMembershipEvent.deleteMany({ where: { teamId } })
  await e2eDb.teamInvite.deleteMany({ where: { teamId } })
  await e2eDb.teamCurrency.deleteMany({ where: { teamId } })
  await e2eDb.user.updateMany({ where: { activeTeamId: teamId }, data: { activeTeamId: null } })
  await e2eDb.team.delete({ where: { id: teamId } }).catch((err) => {
    // Loud, not fatal: a stray lab is swept by `reset:e2e`, and failing teardown
    // would mask whatever the spec actually found.
    console.warn(`[e2e/lab] could not delete lab ${teamId}: ${err?.code ?? err}`)
  })
}

/**
 * Seed N ready papers into a lab — the precondition most literature specs open
 * with, written once instead of in every `beforeAll`.
 *
 * Direct Prisma on purpose: the real ingestion route makes a paid call and
 * parses a PDF, which is not what these specs are testing.
 */
export async function seedPapers(
  lab: Lab,
  count: number,
  tag = 'fixture',
): Promise<string[]> {
  const stamp = `${tag}-${lab.teamId.slice(-6)}`
  const rows = await Promise.all(
    Array.from({ length: count }, (_, i) =>
      e2eDb.paper.create({
        data: {
          teamId: lab.teamId,
          title: `[E2E ${tag}] paper ${i}`,
          authors: [`Author${i}, E2E`],
          abstract: `Deterministic E2E abstract ${i} — reports a measured outcome for condition ${i}.`,
          sourceType: 'pdf',
          status: 'ready',
          fullText: `Deterministic E2E full text ${i}.`,
          contentHash: `${stamp}-${i}`,
          uploadedByUserId: lab.leaderUserId,
        },
        select: { id: true },
      }),
    ),
  )
  return rows.map((r) => r.id)
}
