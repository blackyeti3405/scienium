import 'server-only'
import type Anthropic from '@anthropic-ai/sdk'
import { anthropic } from '@/lib/anthropic'
import { db } from '@/lib/db'
import { logEvent } from '@/lib/observability/log'
import { currentAiScope, type AiScope } from '@/lib/ai/scope'
import {
  AI_RATE_VERSION,
  costMicros,
  modelFor,
  type AiOperationName,
  type AiTokenUsage,
} from '@/lib/ai/models'

/**
 * The single door every paid provider call goes through (REFACTOR2 P1-R3,
 * budget half). Three jobs, none of which a call site can forget:
 *
 *  1. **Model selection** — the operation name picks the model, so no call site
 *     carries a hardcoded model string. See `lib/ai/models.ts`.
 *  2. **Kill switch** — a global env flag and a per-team flag, checked BEFORE
 *     the call. This is the lever you want to already exist on the day
 *     something loops.
 *  3. **Accounting** — a durable `AiUsage` row per call: team, operation, model,
 *     the three input-token buckets, output tokens, and cost in micro-dollars at
 *     a stamped rate version. `lib/anthropic.ts` has always logged token counts;
 *     logs evaporate. These rows are queryable, and they join to class and
 *     school through `Team`, so "what did period 3 spend" is a GROUP BY.
 *
 * There is deliberately NO enforcement here yet — nothing is refused for being
 * over budget. Caps set before a week of real classroom data would be a guess,
 * and a cap that fires mid-lesson is worse than the bill it saved. Accounting
 * first, numbers second (docs/TODO.md → "AI cost review").
 */

/** Thrown when the kill switch is engaged. Routes map it to a 503. */
export class AiDisabledError extends Error {
  constructor(readonly reason: 'global' | 'team') {
    super(
      reason === 'global'
        ? 'AI features are temporarily switched off.'
        : 'AI features are switched off for your lab.',
    )
    this.name = 'AiDisabledError'
  }
}

/** Global stop, flipped without a deploy. Any non-empty value other than `0`/`false` engages it. */
function globalKillEngaged(): boolean {
  const raw = process.env.AI_KILL_SWITCH?.trim().toLowerCase()
  return !!raw && raw !== '0' && raw !== 'false'
}

/**
 * Refuse the call if either switch is engaged.
 *
 * FAILS CLOSED, matching the limiter's posture (P1-R4): if the team flag can't
 * be read, we do not know whether spending is allowed, and the safe reading of
 * "don't know" on a paid call is no.
 */
async function assertAiEnabled(teamId: string | null): Promise<void> {
  if (globalKillEngaged()) throw new AiDisabledError('global')
  if (!teamId) return
  let disabledAt: Date | null
  try {
    const team = await db.team.findUnique({ where: { id: teamId }, select: { aiDisabledAt: true } })
    disabledAt = team?.aiDisabledAt ?? null
  } catch {
    throw new AiDisabledError('team')
  }
  if (disabledAt) throw new AiDisabledError('team')
}

function readUsage(usage: unknown): AiTokenUsage {
  const u = (usage ?? {}) as Record<string, unknown>
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  return {
    inputTokens: n(u.input_tokens),
    outputTokens: n(u.output_tokens),
    cacheReadInputTokens: n(u.cache_read_input_tokens),
    cacheCreationInputTokens: n(u.cache_creation_input_tokens),
  }
}

/** UTC day bucket, so a class's spend rolls up on one calendar boundary everywhere. */
function utcDay(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

/**
 * Record what a call cost. Never rethrows: accounting is not worth failing a
 * student's already-paid-for request over. A dropped row is a gap in a report;
 * a thrown error here would be a broken quiz.
 */
function record(
  operation: AiOperationName,
  model: string,
  scope: AiScope,
  outcome: 'ok' | 'error',
  usage: AiTokenUsage,
): void {
  const failed = (err: unknown) => {
    logEvent({
      event: 'ai_usage.record_failed',
      outcome: 'error',
      detail: `${operation}:${err instanceof Error ? err.constructor.name : 'unknown'}`,
    })
  }
  // try/catch AND .catch: the promise chain alone does not cover a SYNCHRONOUS
  // throw building the call, which is exactly what happens when the client is
  // missing the model. "Never rethrows" has to mean never, or the accounting
  // becomes a new way for a paid, already-successful call to fail.
  try {
    const cost = costMicros(model, usage)
    db.aiUsage
      .create({
        data: {
          operation,
          model,
          teamId: scope.teamId,
          userId: scope.userId,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cacheReadInputTokens: usage.cacheReadInputTokens,
          cacheCreationInputTokens: usage.cacheCreationInputTokens,
          costMicros: cost,
          rateVersion: AI_RATE_VERSION,
          outcome,
          day: utcDay(),
        },
      })
      .catch(failed)
  } catch (err) {
    failed(err)
  }
}

type CreateParams = Omit<Anthropic.MessageCreateParamsNonStreaming, 'model'>
type StreamParams = Omit<Anthropic.MessageStreamParams, 'model'>

/**
 * One non-streaming paid call. The operation picks the model — do not pass one.
 */
export async function aiCreate(
  operation: AiOperationName,
  params: CreateParams,
): Promise<Anthropic.Message> {
  const scope = currentAiScope()
  await assertAiEnabled(scope.teamId)
  const model = modelFor(operation)
  try {
    const message = await anthropic().messages.create({ ...params, model })
    record(operation, model, scope, 'ok', readUsage(message.usage))
    return message
  } catch (err) {
    // A failed call still consumed input tokens often enough to be worth a row;
    // we just have no usage block to read, so it lands as a zero-cost error row.
    record(operation, model, scope, 'error', readUsage(undefined))
    throw err
  }
}

/**
 * One streaming paid call. Usage is read from `finalMessage()`, which only
 * registers a listener — the caller still owns consumption of the stream.
 */
export function aiStream(
  operation: AiOperationName,
  params: StreamParams,
  scope: AiScope = currentAiScope(),
): ReturnType<Anthropic['messages']['stream']> {
  const model = modelFor(operation)
  const stream = anthropic().messages.stream({ ...params, model })
  stream.finalMessage().then(
    (msg) => record(operation, model, scope, 'ok', readUsage(msg.usage)),
    () => record(operation, model, scope, 'error', readUsage(undefined)),
  )
  return stream
}

/**
 * Kill-switch gate for streaming callers, which build their stream inside a
 * response body and cannot await mid-construction. Call it before opening the
 * stream — `aiStream` itself does not, because by then the response has started.
 */
export async function assertAiSpendAllowed(): Promise<void> {
  await assertAiEnabled(currentAiScope().teamId)
}
