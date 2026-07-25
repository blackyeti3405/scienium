import 'server-only'
import { createHash } from 'crypto'
import { db } from '@/lib/db'

/**
 * Server-owned confirmations for destructive commands (REFACTOR2 P1-R1).
 *
 * The old protocol was two "phases" made of client-sent booleans: `confirmWipe`
 * meant "I saw the warning" and `confirmRemoveIds` meant "I approved these
 * papers". A direct caller skipped both and deleted any ready paper ids it knew,
 * because a flag the client sends is not a capability — the UI's confirmation
 * dialog was the only thing standing in front of the delete.
 *
 * Now the SERVER decides what may be destroyed, records that decision as a
 * single-use proposal, and executes phase 2 only for a request that presents the
 * matching token and the byte-identical payload. The proposal binds actor, team,
 * command, payload, and expiry; consumption is a compare-and-set, so a replayed
 * token does nothing.
 */

/** Commands that require a server-issued proposal before they will execute. */
export type DestructiveCommand = 'topic_paper_removal' | 'discovery_tree_reset'

/** A proposal is deliberately short-lived: it authorizes one dialog, not a session. */
export const PROPOSAL_TTL_MS = 10 * 60_000

/**
 * Canonical digest of what the server proposed.
 *
 * Ids are sorted so ordering cannot change the digest, and the parts are
 * JSON-framed rather than concatenated so no field value can impersonate a
 * delimiter and let two different payloads hash alike.
 */
export function proposalDigest(parts: {
  command: DestructiveCommand
  targetIds: string[]
  /** Extra bound context, e.g. the old/new topic for a topic change. */
  context?: (string | null)[]
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify([parts.command, [...parts.targetIds].sort(), parts.context ?? []]),
    )
    .digest('hex')
}

/** Issue a single-use proposal. Returns the token to hand back to the client. */
export async function proposeDestructive(input: {
  teamId: string
  actorUserId: string
  command: DestructiveCommand
  targetIds: string[]
  context?: (string | null)[]
}): Promise<string> {
  const proposal = await db.destructiveProposal.create({
    data: {
      teamId: input.teamId,
      actorUserId: input.actorUserId,
      command: input.command,
      payloadDigest: proposalDigest(input),
      expiresAt: new Date(Date.now() + PROPOSAL_TTL_MS),
    },
    select: { id: true },
  })
  return proposal.id
}

export type ConsumeResult =
  | { ok: true }
  /** No matching live proposal, or the payload does not match what was proposed. */
  | { ok: false; reason: 'invalid' }

/**
 * Consume a proposal for exactly this actor, team, command, and payload.
 *
 * Every mismatch collapses to `invalid`: a caller probing with a guessed token,
 * an expired one, a replayed one, or the right token carrying a *different* set
 * of ids all get the same answer, so this cannot be used to enumerate what other
 * proposals exist. The consuming update is predicated on `consumedAt: null`, so
 * two concurrent phase-2 requests cannot both proceed.
 */
export async function consumeDestructive(input: {
  token: string
  teamId: string
  actorUserId: string
  command: DestructiveCommand
  targetIds: string[]
  context?: (string | null)[]
}): Promise<ConsumeResult> {
  const digest = proposalDigest(input)
  const consumed = await db.destructiveProposal.updateMany({
    where: {
      id: input.token,
      teamId: input.teamId,
      actorUserId: input.actorUserId,
      command: input.command,
      payloadDigest: digest,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { consumedAt: new Date() },
  })
  return consumed.count === 1 ? { ok: true } : { ok: false, reason: 'invalid' }
}
