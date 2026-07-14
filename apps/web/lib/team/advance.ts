import 'server-only'
import { db } from '@/lib/db'
import { PHASE_ORDER, type Phase } from '@/lib/phase'

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

/** Sources required to leave literature_review (mirrors the 25 literature slots). */
export const LITERATURE_SOURCE_TARGET = 25

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
export function nextPhase(phase: Phase): Phase | null {
  const i = PHASE_ORDER.indexOf(phase)
  return i >= 0 && i < PHASE_ORDER.length - 1 ? PHASE_ORDER[i + 1] : null
}

/**
 * Transitions a student advances through at their own pace, with no
 * mechanically-checkable gate — a free "Advance" click bumps the phase. These
 * are the later milestones (starting data collection → `working`, and advancing
 * to competition → `showcase`); teams self-pace them rather than waiting on a
 * teacher sign-off.
 */
export const SELF_ADVANCE_TRANSITIONS: Partial<Record<Phase, Phase>> = {
  research_planning: 'working',
  working: 'showcase',
}

export function isSelfAdvance(from: Phase): boolean {
  return from in SELF_ADVANCE_TRANSITIONS
}

/**
 * Computes literature_review → research_planning readiness for a team:
 * how many sources are ready, and for each member how many of those they've
 * demonstrated proficiency on. `canAdvance` is true only at/after the target
 * with every member proficient on all of them.
 */
export async function getLiteratureAdvanceProgress(
  teamId: string,
  fromPhase: Phase,
): Promise<AdvanceProgress> {
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
      ready: sourceCount >= LITERATURE_SOURCE_TARGET && demonstratedCount >= LITERATURE_SOURCE_TARGET,
    }
  })

  const membersReady = memberProgress.filter((m) => m.ready).length
  const canAdvance =
    sourceCount >= LITERATURE_SOURCE_TARGET &&
    memberProgress.length > 0 &&
    memberProgress.every((m) => m.ready)

  return {
    fromPhase,
    toPhase: nextPhase(fromPhase),
    sourceCount,
    sourceTarget: LITERATURE_SOURCE_TARGET,
    members: memberProgress,
    membersReady,
    memberCount: members.length,
    canAdvance,
  }
}