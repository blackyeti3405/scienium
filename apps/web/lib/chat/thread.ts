import { randomUUID } from 'crypto'

/**
 * Server-owned chat-thread machinery shared by every "server owns the
 * conversation, client sends one new user turn" route (paper chat, the Vega
 * study thread): trim-leading-assistant + BLK-6 cache_control breakpoints,
 * and the persist-pending-then-complete-transaction turn lifecycle. Each
 * route still owns its own Prisma model, scope (paperId vs teamId), and
 * Anthropic call — only the identical control flow lives here.
 */

export type StoredMessage = { role: 'user' | 'assistant'; content: string }
export type ChatContent =
  | string
  | Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }>
export type ChatTurn = { role: 'user' | 'assistant'; content: ChatContent }

/**
 * Builds the Anthropic `messages` array from a bounded, DESC-ordered history
 * window plus the new user turn.
 *
 * The bounded window can begin mid-exchange (on an assistant turn) when writes
 * interleave — user rows are written before the paid call, assistant rows
 * after (or, for the team-shared Vega thread, concurrent teammates interleave
 * turns by createdAt). Anthropic requires the first message to be a user
 * turn, so leading assistant rows are trimmed before prepending history to
 * the new user message.
 *
 * Cache breakpoints go on the last two turns (BLK-6): without one in
 * `messages`, every prior turn re-bills at full price each request — O(N²)
 * spend over a long chat. Marking the newest turns caches the whole
 * conversation prefix, so the next request re-reads it at ~10% cost; two
 * breakpoints keep a hit even when turns interleave by one message.
 */
export function buildChatTurns(rowsDesc: StoredMessage[], message: string): ChatTurn[] {
  const priorAsc = rowsDesc.slice().reverse()
  let head = 0
  while (head < priorAsc.length && priorAsc[head].role !== 'user') head++
  const convo: ChatTurn[] = [
    ...priorAsc.slice(head).map((m) => ({ role: m.role, content: m.content as ChatContent })),
    { role: 'user' as const, content: message },
  ]
  for (const idx of [convo.length - 1, convo.length - 2]) {
    const turn = idx >= 0 ? convo[idx] : undefined
    if (turn && typeof turn.content === 'string') {
      turn.content = [{ type: 'text', text: turn.content, cache_control: { type: 'ephemeral' } }]
    }
  }
  return convo
}

export type ChatUsage = { inputTokens: number; outputTokens: number }

/**
 * Runs one server-owned chat turn: persists the user message as `pending`
 * BEFORE the paid call (so a failed call leaves a durable record rather than
 * silently dropping the turn), invokes `callAnthropic`, then either marks the
 * turn `error` (caller returns its own error response) or completes the user
 * turn + persists the assistant reply in one transaction.
 */
export async function runChatTurn(opts: {
  createPending: (requestId: string) => Promise<{ id: string }>
  callAnthropic: () => Promise<{ reply: string; usageJson: ChatUsage | undefined }>
  onError: (err: unknown) => void
  markError: (userRowId: string) => Promise<unknown>
  complete: (
    userRowId: string,
    usageJson: ChatUsage | undefined,
    reply: string,
    requestId: string,
  ) => Promise<unknown>
}): Promise<{ ok: true; reply: string } | { ok: false }> {
  const requestId = randomUUID()
  const userRow = await opts.createPending(requestId)

  let reply: string
  let usageJson: ChatUsage | undefined
  try {
    const result = await opts.callAnthropic()
    reply = result.reply
    usageJson = result.usageJson
  } catch (err) {
    opts.onError(err)
    await opts.markError(userRow.id).catch(() => {})
    return { ok: false }
  }

  await opts.complete(userRow.id, usageJson, reply, requestId)
  return { ok: true, reply }
}
