import 'server-only'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

/**
 * The per-student data inventory (REFACTOR2 P1-R9).
 *
 * ONE list drives both directions — export reads it, erasure deletes it — so the
 * two can never disagree about what "this student's data" means. That drift is
 * the failure mode a hand-written export procedure and a hand-written deletion
 * procedure always eventually reach.
 *
 * ## What is NOT here, and why
 *
 * **Team-shared work stays with the team.** Project logs, discovery nodes, the
 * synthesis matrix, experiments, purchased buildings, papers — every one carries
 * an attribution column pointing at the author (`created_by_user_id`,
 * `visited_by_user_id`, …), and the runbook's policy is that a team's artifacts
 * are the team's work product. Deleting one member's contributions would gut
 * their teammates' project. That policy is why the `users` row is TOMBSTONED
 * rather than dropped: those FKs are required, so the row has to survive with
 * its personal fields blanked.
 *
 * **`DiscoverySourceVisit` stays** even though the runbook lists it as
 * per-student. The row is the team's once-ever KP claim for a source (see
 * P1-S14); deleting it would let the same source be farmed for KP again. It
 * holds a user id for attribution and no FK, so the tombstone covers it.
 * `docs/runbooks/data-export-delete.md` is corrected to match.
 *
 * **`UploadedAsset` stays.** It is the ledger that proves an R2 object exists;
 * deleting the row strands the object permanently (exactly the failure P1-R12
 * closed). The storage step retires objects through the normal `orphaned` →
 * reclaim-sweep lifecycle instead.
 *
 * **`TeamMembershipEvent` stays.** It is the append-only authorization log, and
 * after the tombstone it names a user with no personal fields left.
 */

/**
 * One model's worth of a student's rows.
 *
 * `model` is the Prisma delegate name. Working through the delegate by name
 * costs one narrow cast in `rowsFor`/`deleteRowsFor` and buys a 22-entry data
 * table instead of 44 near-identical one-line functions.
 */
export interface InventoryEntry {
  /** Stable key in the export bundle. */
  key: string
  model: string
  /** The user column on this model — not always `userId`. */
  column: string
}

/**
 * Ordered CHILD-FIRST: every entry is deleted in this order, so a row is gone
 * before the row it references. Each child carries its own user column, so
 * filtering by the subject is enough at every level.
 */
export const PER_STUDENT_INVENTORY: InventoryEntry[] = [
  // Literature — attempts reference their session/parent.
  { key: 'paper_quiz_attempts', model: 'paperQuizAttempt', column: 'userId' },
  { key: 'paper_quiz_sessions', model: 'paperQuizSession', column: 'userId' },
  { key: 'paper_explanation_attempts', model: 'paperExplanationAttempt', column: 'userId' },
  { key: 'paper_explanations', model: 'paperExplanation', column: 'userId' },
  { key: 'paper_proficiencies', model: 'paperProficiency', column: 'userId' },
  { key: 'paper_chat_messages', model: 'paperChatMessage', column: 'userId' },
  { key: 'paper_relevance_notes', model: 'paperRelevanceNote', column: 'userId' },
  // Expertise — attempts reference their exam.
  { key: 'expertise_attempts', model: 'expertiseAttempt', column: 'userId' },
  { key: 'expertise_exams', model: 'expertiseExam', column: 'userId' },
  // Vocabulary and Codex.
  { key: 'vocab_cards', model: 'vocabCard', column: 'userId' },
  { key: 'vocab_kp_days', model: 'vocabKpDay', column: 'userId' },
  { key: 'vocab_paper_curations', model: 'vocabPaperCuration', column: 'userId' },
  { key: 'codex_lesson_progress', model: 'codexLessonProgress', column: 'userId' },
  { key: 'codex_kp_days', model: 'codexKpDay', column: 'userId' },
  // Daily / rewards.
  { key: 'lab_credit_claims', model: 'labCreditClaim', column: 'userId' },
  // Communications and feed.
  // Receipts BEFORE the notifications themselves: deleting the subject's own
  // notifications cascades their receipts, but a receipt against a TEAM-WIDE
  // notice is a per-student row that would otherwise survive erasure.
  { key: 'notification_reads', model: 'notificationRead', column: 'userId' },
  { key: 'notifications', model: 'notification', column: 'userId' },
  { key: 'notification_prefs', model: 'notificationPref', column: 'userId' },
  { key: 'activity_feed', model: 'activityFeed', column: 'userId' },
  { key: 'vega_study_messages', model: 'vegaStudyMessage', column: 'userId' },
  // Fair hub and rubric self-assessment.
  { key: 'fair_user_associations', model: 'fairUserAssociation', column: 'userId' },
  { key: 'rubric_self_assessments', model: 'rubricSelfAssessment', column: 'assessedByUserId' },
  // Enrolment history. Live `TeamMember` rows are retired through `departTeam`
  // instead, so lead handover and last-member archiving still happen.
  { key: 'class_join_requests', model: 'classJoinRequest', column: 'userId' },
]

/** Minimal shape of a Prisma delegate: the two calls this module makes. */
type Delegate = {
  findMany(args: { where: Record<string, string> }): Promise<unknown[]>
  deleteMany(args: { where: Record<string, string> }): Promise<{ count: number }>
}

/**
 * Resolve a delegate by name. The cast is confined here; a typo in the
 * inventory throws at the first use rather than silently exporting nothing.
 */
function delegate(client: Prisma.TransactionClient | typeof db, model: string): Delegate {
  const d = (client as unknown as Record<string, Delegate | undefined>)[model]
  if (!d || typeof d.findMany !== 'function') {
    throw new Error(`Unknown model in the data inventory: ${model}`)
  }
  return d
}

/** Read every inventoried row for one student, keyed by inventory key. */
export async function collectSubjectRows(userId: string): Promise<Record<string, unknown[]>> {
  const out: Record<string, unknown[]> = {}
  for (const entry of PER_STUDENT_INVENTORY) {
    out[entry.key] = await delegate(db, entry.model).findMany({ where: { [entry.column]: userId } })
  }
  return out
}

/**
 * Delete every inventoried row for one student, in list order.
 *
 * Takes a transaction client because a half-applied erasure is worse than none:
 * the caller commits the deletes and the `users` tombstone together.
 */
export async function deleteSubjectRows(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const entry of PER_STUDENT_INVENTORY) {
    const { count } = await delegate(tx, entry.model).deleteMany({
      where: { [entry.column]: userId },
    })
    counts[entry.key] = count
  }
  return counts
}
