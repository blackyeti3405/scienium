import type { MemberRole } from '@prisma/client'
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
const FIXTURE_PHASE = 'working'
const FIXTURE_LAB_TYPE = 'volt_lab'
const KP_BASELINE = 100_000
const CLEARANCE_BASELINE = 3

/**
 * The SAME explicit gateway spread `prisma/seed-e2e.mjs` gives the shared
 * fixture, and it is not cosmetic.
 *
 * The isometric scene's DEFAULT gateway cells sit close enough that one 128px
 * sprite's silhouette covers a neighbour's centre — Playwright then reports
 * "subtree intercepts pointer events" and cannot click "Open Discovery" at all.
 * A lab created without placements falls back to exactly those default cells, so
 * every disposable lab was inheriting a layout the seeder exists to avoid, and
 * specs that only wanted a clean database started failing on building geometry.
 *
 * Kept in step with the seeder by hand — the two must not drift, because a
 * disposable lab is supposed to behave like the fixture in every way a spec can
 * observe.
 */
const GATEWAY_LAYOUT: [string, number, number][] = [
  ['discovery', 1, 3],
  ['literature_review', -1, 3],
  ['operations_hub', 3, 3],
  ['pvp', 3, 1],
  ['research_plan', -2, 1],
  ['science_fair', 3, -1],
  ['working', 1, -2],
]

export interface Lab {
  teamId: string
  leaderUserId: string
  /** The class the leader belongs to, so teacher-scope specs still resolve. */
  classId: string | null
}

/**
 * One account's membership as it stood before the disposable lab borrowed them,
 * so `dispose()` can put it back. `TeamMember.userId` is `@@unique` (v0.71.0,
 * one-team-at-a-time) — a real membership row, not just `activeTeamId`, so a
 * disposable lab can hold a second one only by giving up the first for its
 * lifetime.
 */
interface PriorMembership {
  userId: string
  teamId: string
  role: MemberRole
  previousActiveTeamId: string | null
}

interface Anchor {
  leaderUserId: string
  classId: string | null
  previousActiveTeamId: string | null
  previousMembership: { teamId: string; role: MemberRole } | null
  /** Every OTHER member of the shared fixture lab (in practice: the student). */
  coMembers: PriorMembership[]
}

async function resolveAnchor(includeCoMembers: boolean): Promise<Anchor> {
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
  const membership = await e2eDb.teamMember.findUnique({
    where: { userId: leader.id },
    select: { teamId: true, role: true },
  })

  let coMembers: PriorMembership[] = []
  if (includeCoMembers) {
    const rows = await e2eDb.teamMember.findMany({
      where: { teamId: shared.id, userId: { not: leader.id } },
      select: { userId: true, teamId: true, role: true, user: { select: { activeTeamId: true } } },
    })
    coMembers = rows.map((r) => ({
      userId: r.userId,
      teamId: r.teamId,
      role: r.role,
      previousActiveTeamId: r.user.activeTeamId ?? shared.id,
    }))
  }

  return {
    leaderUserId: leader.id,
    classId: leader.classId,
    previousActiveTeamId: leader.activeTeamId ?? shared.id,
    previousMembership: membership,
    coMembers,
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
 * ## Choosing a label: it is rendered, and `getByRole` matches SUBSTRINGS
 *
 * The team name is the accessible name of the status strip's team button, and
 * Playwright's `getByRole('button', { name: X })` matches when X is a
 * case-insensitive SUBSTRING of the element's name. So a label that contains a
 * UI control's text silently steals that control's locator — and because the
 * status strip sits behind any open feature panel, the symptom is not "wrong
 * element" but the baffling `<div … class="feature-panel__backdrop"> intercepts
 * pointer events`, retried until timeout.
 *
 * This is not hypothetical: `createLab('rubric-self-check')` made
 * `getByRole('button', { name: 'Self-check' })` resolve to the team button
 * instead of the Fair Hub tab. Keep labels free of words that appear in
 * clickable UI text ("rubric", "papers", "self-check", "upgrade", "discovery"),
 * or run them together so the query string is no longer a substring.
 *
 * `activeTeamId` is only repointed when `claimActive` is true (the default).
 * A second, "foreign" lab for an IDOR case must NOT steal the active team.
 *
 * `claimActive` also decides whether the leader gets a REAL membership row in
 * the new team. `TeamMember.userId` is `@@unique` (v0.71.0, one-team-at-a-
 * time), so a claimed lab must vacate the leader's existing membership first —
 * a raw delete, not `leaveOtherTeams`/`departTeam`: those run lead-transfer/
 * archive side effects meant for a real student leaving a team, which must
 * never fire just because a disposable lab borrowed the leader for one spec
 * file. `dispose()` restores it. A foreign (non-claimed) lab gets no
 * membership row at all — impossible anyway under the unique constraint, and
 * unneeded: an IDOR fixture only needs the team to exist, never a membership
 * the leader would actually operate through.
 */
export async function createLab(
  label: string,
  claimActive = true,
  /**
   * Bring the shared fixture's OTHER members (in practice the student account)
   * into the disposable lab as members too.
   *
   * Only meaningful with `claimActive`. Off by default because it is not free:
   * those accounts give up their own membership for the file's lifetime, so a
   * spec that does not actually assert co-member behaviour should not pay for
   * it. Specs that DO — anything using `withSeedPage(browser, 'student')` to
   * prove a team-shared surface — need it, because without it the leader has
   * moved and the student has not, and "same team" is no longer true.
   */
  bringCoMembers = false,
): Promise<OwnedLab> {
  const withCoMembers = claimActive && bringCoMembers
  const anchor = await resolveAnchor(withCoMembers)

  if (claimActive && anchor.previousMembership) {
    await e2eDb.teamMember.delete({
      where: {
        userId_teamId: { userId: anchor.leaderUserId, teamId: anchor.previousMembership.teamId },
      },
    })
  }
  for (const co of anchor.coMembers) {
    await e2eDb.teamMember.delete({
      where: { userId_teamId: { userId: co.userId, teamId: co.teamId } },
    })
  }

  const team = await e2eDb.team.create({
    data: {
      name: `[E2E ${label}]`,
      teamLeadId: anchor.leaderUserId,
      classId: anchor.classId,
      phase: FIXTURE_PHASE,
      labType: FIXTURE_LAB_TYPE,
      ...(claimActive
        ? { members: { create: { userId: anchor.leaderUserId, role: 'lead' as const } } }
        : {}),
      currency: { create: { kp: KP_BASELINE, clearanceLevel: CLEARANCE_BASELINE } },
      gatewayPlacements: {
        create: GATEWAY_LAYOUT.map(([gatewayKey, posX, posY]) => ({ gatewayKey, posX, posY })),
      },
    },
    select: { id: true },
  })
  // The app resolves the active team through membership, so this is what makes
  // the signed-in leader's requests land on the disposable lab.
  if (claimActive) {
    await e2eDb.user.update({ where: { id: anchor.leaderUserId }, data: { activeTeamId: team.id } })
  }
  for (const co of anchor.coMembers) {
    await e2eDb.teamMember.create({
      data: { userId: co.userId, teamId: team.id, role: co.role },
    })
    await e2eDb.user.update({ where: { id: co.userId }, data: { activeTeamId: team.id } })
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
      // Same order for every borrowed co-member: point them home BEFORE the
      // lab goes, so a failed delete cannot strand an account on a dying team.
      for (const co of anchor.coMembers) {
        await e2eDb.user
          .update({ where: { id: co.userId }, data: { activeTeamId: co.previousActiveTeamId } })
          .catch(() => {})
      }
      await disposeLab(team.id)
      for (const co of anchor.coMembers) {
        await e2eDb.teamMember
          .upsert({
            where: { userId_teamId: { userId: co.userId, teamId: co.teamId } },
            create: { userId: co.userId, teamId: co.teamId, role: co.role },
            update: {},
          })
          .catch(() => {})
      }
      // disposeLab() already deleted this lab's own membership row above, so
      // the leader again has zero rows and the unique constraint allows this.
      if (claimActive && anchor.previousMembership) {
        await e2eDb.teamMember
          .upsert({
            where: {
              userId_teamId: {
                userId: anchor.leaderUserId,
                teamId: anchor.previousMembership.teamId,
              },
            },
            create: {
              userId: anchor.leaderUserId,
              teamId: anchor.previousMembership.teamId,
              role: anchor.previousMembership.role,
            },
            update: {},
          })
          .catch(() => {})
      }
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
  // A runtime import: the delete inventory lives in the .mjs script that also
  // backs the `reset:e2e` CLI, so both paths share ONE owner. They used to keep
  // separate lists and both were incomplete the same way — a lab that had
  // recorded codex progress or bought a building could not be deleted by
  // either, so a crashed run left a `[E2E …]` team no later reset could clear.
  const { retireDisposableTeam, FIXTURE_TEAM_NAME } = (await import(
    '../prisma/reset-e2e.mjs'
  )) as unknown as {
    retireDisposableTeam: (
      db: typeof e2eDb,
      teamId: string,
      reassignAssetsTo?: string,
    ) => Promise<unknown>
    FIXTURE_TEAM_NAME: string
  }

  // `uploaded_assets.team_id` is ON DELETE RESTRICT (P1-R12): the ledger row is
  // the only record that an R2 object exists, so deleting the team while rows
  // remain is refused — correctly. Deleting the rows instead would strand the
  // objects permanently in a bucket shared with production. Any asset this lab
  // created is REASSIGNED to the shared fixture team, still `orphaned`: the
  // object stays tracked and the normal reclaim sweep retires it.
  const shared = await e2eDb.team.findFirst({
    where: { name: FIXTURE_TEAM_NAME },
    select: { id: true },
  })

  const err = await retireDisposableTeam(e2eDb, teamId, shared?.id)
  if (err) {
    // Loud, not fatal: a stray lab is swept by `reset:e2e`, and failing teardown
    // would mask whatever the spec actually found.
    const code = (err as { code?: string })?.code
    console.warn(`[e2e/lab] could not delete lab ${teamId}: ${code ?? err}`)
  }
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
