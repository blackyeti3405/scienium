import 'server-only'
import { db } from '@/lib/db'
import { PHASE_ORDER, type Phase } from '@/lib/phase'
import { recordActivity } from '@/lib/activity/log'

/**
 * Phase-advancement gate (Feature 1e).
 *
 * There is no automatic progression in scienium — a team advances by meeting an
 * explicit, checkable gate. The first such gate leaves `literature_review`:
 * the team must have uploaded the full set of sources AND every member must have
 * independently demonstrated proficiency (per-student `PaperProficiency`) on all
 * of them. Bigger teams therefore take more total work to advance, balancing the
 * extra KP they earn.
 *
 * This module is the single source of truth for that gate — both the lab-scene
 * progress affordance and POST /api/team/advance-phase read it.
 */

/**
 * The literature review is no longer one all-or-nothing gate at 25 sources. It
 * is three milestones, and EVERY member must be proficient on the count for the
 * milestone to count — a lab moves at the pace of its whole team, not its
 * keenest student.
 *
 *   10  unlocks entering a research idea, which is what advances the team to
 *       `plan_refinement`. The count opens the door; the idea walks through it.
 *   20  advances to `project_development` on its own (no second action).
 *   25  pays a one-time KP bonus. Not a phase gate — the arc is already over by
 *       then, so the last five sources are rewarded rather than required.
 */
export const LITERATURE_TIERS = {
  idea: 10,
  projectDevelopment: 20,
  bonus: 25,
} as const

/**
 * Paid per MEMBER, into the shared pool: building costs scale with lab size
 * (`teamCostMultiplier`), so a flat team bonus would be worth progressively less
 * to a bigger lab that had to do proportionally more work to earn it.
 */
export const LITERATURE_BONUS_KP_PER_MEMBER = 5000

/** Kept for the 25-slot upload UI, which is unchanged. */
export const LITERATURE_SOURCE_TARGET = 25

/**
 * The source count this phase's gate needs, or null where no literature gate
 * applies. Driven off the phase so the route, the progress affordance and the
 * server check can never disagree about which tier is live.
 */
export function literatureTargetFor(phase: Phase): number | null {
  if (phase === 'literature_review') return LITERATURE_TIERS.idea
  if (phase === 'plan_refinement') return LITERATURE_TIERS.projectDevelopment
  return null
}

export interface MemberProgress {
  userId: string
  name: string
  /** Ready sources this member has demonstrated proficiency on. */
  demonstratedCount: number
  ready: boolean
}

export interface AdvanceProgress {
  fromPhase: Phase
  /** The phase the team would move to, or null if there's no gate from here. */
  toPhase: Phase | null
  sourceCount: number
  sourceTarget: number
  members: MemberProgress[]
  membersReady: number
  memberCount: number
  canAdvance: boolean
}

/** The next phase in PHASE_ORDER, or null if already at the end. */
function nextPhase(phase: Phase): Phase | null {
  const i = PHASE_ORDER.indexOf(phase)
  return i >= 0 && i < PHASE_ORDER.length - 1 ? PHASE_ORDER[i + 1] : null
}

/**
 * There are no free "Advance" clicks any more (v0.80.0).
 *
 * Both surviving transitions are earned by an ACTION, not by pressing a button
 * that does nothing but increment a counter:
 *
 *   discovery         → literature_review   locking a final topic
 *   literature_review → working             finishing the review + entering an idea
 *
 * The two transitions this map used to hold (`research_planning → working` and
 * `working → showcase`) advanced through phases that gated nothing a student
 * could see, so the button asked for a decision that had no content.
 */

/**
 * Computes readiness for whichever literature tier `fromPhase` sits behind
 * (see `literatureTargetFor`): how many sources are ready, and for each member
 * how many of those they have demonstrated proficiency on. `canAdvance` is true
 * only at/after that tier's target with EVERY member proficient on that many.
 */
export async function getLiteratureAdvanceProgress(
  teamId: string,
  fromPhase: Phase,
): Promise<AdvanceProgress> {
  const target = literatureTargetFor(fromPhase) ?? LITERATURE_SOURCE_TARGET
  const [readyPapers, members] = await Promise.all([
    db.paper.findMany({ where: { teamId, status: 'ready' }, select: { id: true } }),
    db.teamMember.findMany({
      where: { teamId },
      orderBy: { joinedAt: 'asc' },
      select: { userId: true, user: { select: { name: true } } },
    }),
  ])

  const readyIds = readyPapers.map((p) => p.id)
  const sourceCount = readyIds.length

  const profs = readyIds.length
    ? await db.paperProficiency.findMany({
        where: { paperId: { in: readyIds }, demonstrated: true },
        select: { userId: true },
      })
    : []

  const demonstratedByUser = new Map<string, number>()
  for (const p of profs) {
    demonstratedByUser.set(p.userId, (demonstratedByUser.get(p.userId) ?? 0) + 1)
  }

  const memberProgress: MemberProgress[] = members.map((m) => {
    const demonstratedCount = demonstratedByUser.get(m.userId) ?? 0
    return {
      userId: m.userId,
      name: m.user.name,
      demonstratedCount,
      ready: sourceCount >= target && demonstratedCount >= target,
    }
  })

  const membersReady = memberProgress.filter((m) => m.ready).length
  const canAdvance =
    literatureTargetFor(fromPhase) !== null &&
    sourceCount >= target &&
    memberProgress.length > 0 &&
    memberProgress.every((m) => m.ready)

  return {
    fromPhase,
    toPhase: nextPhase(fromPhase),
    sourceCount,
    sourceTarget: target,
    members: memberProgress,
    membersReady,
    memberCount: members.length,
    canAdvance,
  }
}

/**
 * Compare-and-set phase bump. `from` is the predicate, so two concurrent requests
 * cannot skip a phase between them and only the one that actually moved the team
 * stamps the phase clock (REFACTOR2 P2-S14) or writes the activity row.
 *
 * Returns whether this call is the one that moved it.
 */
export async function advanceTeamPhase(
  teamId: string,
  actorUserId: string,
  from: Phase,
  to: Phase,
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const { count } = await tx.team.updateMany({
      where: { id: teamId, phase: from },
      data: { phase: to, phaseEnteredAt: new Date() },
    })
    if (count === 0) return false
    await recordActivity(tx, teamId, actorUserId, 'phase_advanced', {
      fromPhase: from,
      toPhase: to,
    })
    return true
  })
}

/**
 * Pay the one-time 25-source bonus if the team has just earned it.
 *
 * Called after any proficiency changes. Idempotent by construction: the grant is
 * an `updateMany` predicated on `literatureBonusAt: null`, so of two concurrent
 * quiz submissions that both see 25/25, exactly one updates a row and only that
 * one credits KP. A boolean read followed by a write would double-pay here.
 *
 * Returns the KP credited (0 when the bar is not met, or it was already paid).
 */
export async function maybeGrantLiteratureBonus(
  teamId: string,
  actorUserId: string,
): Promise<number> {
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { literatureBonusAt: true },
  })
  // Cheap pre-check: skip the counting entirely once it has been paid.
  if (!team || team.literatureBonusAt) return 0

  const [readyPapers, members] = await Promise.all([
    db.paper.findMany({ where: { teamId, status: 'ready' }, select: { id: true } }),
    db.teamMember.findMany({ where: { teamId }, select: { userId: true } }),
  ])
  if (readyPapers.length < LITERATURE_TIERS.bonus || members.length === 0) return 0

  const profs = await db.paperProficiency.findMany({
    where: { paperId: { in: readyPapers.map((p) => p.id) }, demonstrated: true },
    select: { userId: true },
  })
  const byUser = new Map<string, number>()
  for (const p of profs) byUser.set(p.userId, (byUser.get(p.userId) ?? 0) + 1)
  const everyoneProficient = members.every(
    (m) => (byUser.get(m.userId) ?? 0) >= LITERATURE_TIERS.bonus,
  )
  if (!everyoneProficient) return 0

  const kp = LITERATURE_BONUS_KP_PER_MEMBER * members.length

  return db.$transaction(async (tx) => {
    // The CAS: only the caller that flips null → now() pays.
    const { count } = await tx.team.updateMany({
      where: { id: teamId, literatureBonusAt: null },
      data: { literatureBonusAt: new Date() },
    })
    if (count === 0) return 0

    await tx.teamCurrency.upsert({
      where: { teamId },
      create: { teamId, kp },
      update: { kp: { increment: kp } },
    })
    await recordActivity(tx, teamId, actorUserId, 'literature_bonus', {
      sources: LITERATURE_TIERS.bonus,
      members: members.length,
      kp,
    })
    return kp
  })
}
