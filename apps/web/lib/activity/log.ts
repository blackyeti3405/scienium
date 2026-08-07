import 'server-only'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export type ActivityAction =
  | 'paper_upload'
  | 'paper_delete'
  | 'quiz_passed'
  | 'topic_changed'
  | 'discovery_node_added'
  | 'discovery_kp_awarded'
  | 'topic_locked'
  | 'source_promoted'
  | 'phase_advanced'
  // The lab's type was derived from its topic/idea and its plot remapped onto the
  // new catalog. Distinct from `phase_advanced`: a teacher-paced lab is assigned a
  // type when it locks a topic but does not move phase until its teacher says so.
  | 'lab_type_assigned'
  | 'member_joined'
  | 'member_left'
  | 'plan_synced'
  | 'plan_reviewed'
  | 'idea_checked'
  | 'building_purchased'
  | 'building_sold'
  | 'building_upgraded'
  | 'clearance_raised'
  | 'showcase_published'
  | 'log_created'
  | 'log_edited'
  | 'log_deleted'
  | 'codex_lesson_completed'
  | 'explanation_passed'
  | 'synthesis_checked'
  | 'vocab_term_mastered'

/**
 * Actions that are part of a team's PROGRESSION or a teacher's history of what a
 * lab did — the ones a teacher may be looking at when they ask "did this student
 * actually do the work". Losing one of these is losing evidence, so they belong
 * in the same transaction as the domain change (`recordActivity`).
 *
 * Everything not listed here is ambient telemetry: nice in the feed, harmless to
 * drop, and correctly written with `logActivityBestEffort`.
 */
export const DURABLE_ACTIVITY_ACTIONS: ReadonlySet<ActivityAction> = new Set([
  'quiz_passed',
  'explanation_passed',
  'codex_lesson_completed',
  'clearance_raised',
  'phase_advanced',
  'showcase_published',
  'member_joined',
  'topic_locked',
  'discovery_kp_awarded',
  'building_purchased',
  'building_sold',
  'building_upgraded',
  'source_promoted',
  'vocab_term_mastered',
])

/** The subset of the Prisma client a transactional activity write needs. */
type ActivityWriter = {
  activityFeed: { create(args: { data: Record<string, unknown> }): Promise<unknown> }
}

/**
 * Append an activity entry INSIDE the caller's transaction (REFACTOR2 P1-R5).
 *
 * Throws on failure — deliberately. The point is that the feed row and the thing
 * it records either both land or neither does: if a student's KP moved, the
 * teacher-visible evidence that it moved must not be able to go missing on its
 * own. That is the transactional-outbox property the audit asked for, in its
 * simplest correct form (same transaction, so there is nothing to reconcile).
 *
 * Use `logActivityBestEffort` for ambient telemetry.
 */
export async function recordActivity(
  tx: ActivityWriter,
  teamId: string,
  userId: string,
  action: ActivityAction,
  payload: Record<string, unknown>,
): Promise<void> {
  await tx.activityFeed.create({
    data: {
      teamId,
      userId,
      actionType: action,
      payloadJson: payload as Prisma.InputJsonValue,
    },
  })
}

/**
 * Append a team activity entry, swallowing any failure.
 *
 * EXPLICITLY named best-effort (REFACTOR2 P1-R5). This used to be called
 * `logActivity`, which read like a durability guarantee at 28 of its 29 call
 * sites while actually being `.catch(console.error)` — gameplay and
 * teacher-visible history with no contract at all. The name is now the contract:
 * if losing this entry would matter, you want `recordActivity` in a transaction.
 */
export async function logActivityBestEffort(
  teamId: string,
  userId: string,
  action: ActivityAction,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await db.activityFeed.create({
      data: {
        teamId,
        userId,
        actionType: action,
        payloadJson: payload as Prisma.InputJsonValue,
      },
    })
  } catch {
    // Ambient telemetry must never break the main request path.
  }
}

/** Human-readable description derived from an action type + payload. */
export function describeActivity(action: string, payload: Record<string, unknown>): string {
  switch (action as ActivityAction) {
    case 'paper_upload':
      return `uploaded "${payload.title ?? 'a paper'}"`
    case 'paper_delete':
      return `deleted "${payload.title ?? 'a paper'}"`
    case 'quiz_passed':
      return `passed quiz on "${payload.paperTitle ?? 'a paper'}" (${payload.score ?? '?'}%)`
    case 'topic_changed':
      return payload.newTopic
        ? `changed topic to "${payload.newTopic}"`
        : 'cleared the research topic'
    case 'discovery_node_added':
      return `explored "${payload.title ?? 'an article'}"`
    case 'discovery_kp_awarded':
      return `earned ${payload.kp ?? '?'} KP exploring sources`
    case 'topic_locked':
      return `locked in their research topic (+${payload.kp ?? '?'} KP)`
    case 'source_promoted':
      return `promoted "${payload.title ?? 'a source'}" into the literature review`
    case 'phase_advanced':
      return `advanced the lab to ${payload.toPhase ?? 'the next phase'}${payload.labType ? ` · assigned ${payload.labType}` : ''}`
    case 'member_joined':
      return 'joined the lab'
    case 'member_left':
      return 'left the lab'
    case 'plan_synced':
      return 'synced the research plan'
    case 'plan_reviewed':
      return `ran AI review of the research plan`
    case 'idea_checked':
      return `ran originality check (${payload.verdict ?? '?'})`
    case 'clearance_raised':
      return `reached Clearance Level ${payload.level ?? '?'}${payload.title ? ` — ${payload.title}` : ''}`
    case 'showcase_published':
      return `published the project showcase${payload.title ? ` "${payload.title}"` : ''}`
    case 'building_purchased':
      return `purchased ${payload.buildingName ?? 'a building'}`
    case 'building_sold':
      return `sold ${payload.buildingName ?? 'a building'}${payload.refund ? ` for ${payload.refund} KP` : ''}`
    case 'building_upgraded':
      return `upgraded ${payload.buildingName ?? 'a building'} to level ${payload.level ?? '?'}`
    case 'log_created':
      return `added a ${payload.kind === 'failure' ? 'failure' : 'project'} log entry`
    case 'log_edited':
      return `edited a ${payload.kind === 'failure' ? 'failure' : 'project'} log entry`
    case 'log_deleted':
      return `deleted a ${payload.kind === 'failure' ? 'failure' : 'project'} log entry`
    case 'codex_lesson_completed':
      return `completed a Field Codex lesson${payload.trackSlug ? ` (${payload.trackSlug})` : ''}`
    case 'explanation_passed':
      return `explained "${payload.paperTitle ?? 'a paper'}" back to Vega (${payload.score ?? '?'}%)`
    case 'synthesis_checked':
      return `ran a synthesis check (${payload.missed ?? 0} missed)`
    case 'vocab_term_mastered':
      return `mastered the term "${payload.term ?? 'a key term'}"`
    default:
      return action.replace(/_/g, ' ')
  }
}