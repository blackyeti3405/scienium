import 'server-only'
import { db } from '@/lib/db'
import type { Phase } from '@/lib/phase'
import { classifyLabType } from '@/lib/lab-type/classify'
import { transferBuildingsToLabType } from '@/lib/lab-type/transfer'
import { isTeacherPaced } from '@/lib/team/class-scope'
import { advanceTeamPhase } from '@/lib/team/advance'
import { recordActivity } from '@/lib/activity/log'

/**
 * The two phase transitions, in one place.
 *
 *   discovery → literature_review   locking a final topic (`applyTopicLock`)
 *   literature_review → working     entering a research idea (advance-phase route)
 *
 * Both also (re)assign the lab type and carry the plot with it. A team picks a lab
 * type at sign-up on a guess — "whatever you'll probably do" — and is told it will
 * be corrected from the real work. This is where that promise is kept.
 */

/**
 * Re-classify a team's lab type from `text` and move its buildings onto the new
 * catalog. Returns the assigned type, or null if nothing changed.
 *
 * The paid classify call happens OUTSIDE the transaction — holding a DB
 * transaction open across an Anthropic round-trip is the mistake REFACTOR2 P1-R5
 * exists to prevent — and only the write is transactional, so the `labType` and
 * the remapped plot commit together or not at all.
 */
export async function reassignLabType(
  teamId: string,
  dbUserId: string,
  text: string,
): Promise<{ labType: Awaited<ReturnType<typeof classifyLabType>>['labType'] } | null> {
  const { labType } = await classifyLabType(text)

  await db.$transaction(async (tx) => {
    await tx.team.update({ where: { id: teamId }, data: { labType } })
    const transfer = await transferBuildingsToLabType(tx, teamId, labType)
    if (transfer.moved > 0) {
      await recordActivity(tx, teamId, dbUserId, 'lab_type_assigned', {
        labType,
        buildingsTransferred: transfer.moved,
      })
    }
  })

  return { labType }
}

export interface TopicLockOutcome {
  labType: string | null
  /** True when the team moved to `literature_review` on this call. */
  advanced: boolean
  /** True when the phase was held back because a teacher paces this lab. */
  teacherPaced: boolean
}

/**
 * Apply everything that follows from a team locking its FINAL TOPIC.
 *
 * This is the moment the game opens up: the lab is given its type (derived from
 * the topic, with the plot carried across), and — for a self-paced lab — moves to
 * `literature_review`, which unlocks the Literature Review and the Battle Arena.
 *
 * A classroom lab still gets its lab type, because that is identity rather than
 * progress, but does NOT move: its teacher runs the unit and decides when the room
 * advances. Safe to call on every topic write — the phase bump is a compare-and-set
 * on `discovery`, so only the first one moves anything.
 */
export async function applyTopicLock(
  teamId: string,
  dbUserId: string,
  topic: string,
  currentPhase: Phase,
): Promise<TopicLockOutcome> {
  if (currentPhase !== 'discovery') return { labType: null, advanced: false, teacherPaced: false }

  const assigned = await reassignLabType(teamId, dbUserId, topic)

  const teacherPaced = await isTeacherPaced(teamId)
  if (teacherPaced) {
    return { labType: assigned?.labType ?? null, advanced: false, teacherPaced: true }
  }

  const advanced = await advanceTeamPhase(teamId, dbUserId, 'discovery', 'literature_review')
  return { labType: assigned?.labType ?? null, advanced, teacherPaced: false }
}
