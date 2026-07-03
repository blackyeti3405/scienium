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
  | 'member_joined'
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

/**
 * Appends a team activity entry. Fire-and-forget safe: awaiting is optional;
 * never throws so it can't break the calling request.
 */
export async function logActivity(
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
    // Activity logging must never break the main request path.
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
    default:
      return action.replace(/_/g, ' ')
  }
}
