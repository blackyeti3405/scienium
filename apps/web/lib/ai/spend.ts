import 'server-only'
import type Anthropic from '@anthropic-ai/sdk'
import type { z } from 'zod'
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

// ─── The output boundary (REFACTOR2 P2-S9) ───────────────────────────────────
//
// `aiCreate` is the ONE door in; these are the ONE door out. Every call site
// used to read the reply itself, and they disagreed: six dereferenced
// `content[0].type` (a TypeError the moment the array is empty — a refusal, or a
// stop before any block), the rest used `content[0]?` (silently reading a
// leading `thinking`/`tool_use` block as "no text"), and the generic grader
// accepted ANY non-empty array as a grade. Nothing may read `message.content`
// directly any more; `test/llm-output-boundary.test.ts` pins the attacks.

/** The minimum of an Anthropic message these two need — so a fixture is a literal. */
export interface ModelReply {
  content: ReadonlyArray<{ type: string }>
  stop_reason?: string | null
}

/**
 * The FIRST text block, or `''`.
 *
 * `content[0]` is not the text block. The array can be empty, and extended
 * thinking / tool use / server-tool results all emit blocks that lead it — so
 * indexing position 0 is either a crash or a silent empty read, depending on
 * which `?.` the call site happened to write.
 */
export function firstText(message: ModelReply): string {
  const block = message.content.find((b) => b?.type === 'text') as { text?: unknown } | undefined
  return typeof block?.text === 'string' ? block.text : ''
}

export type ModelOutputFailure = 'truncated' | 'no_text' | 'no_json' | 'shape'

export type ModelOutput<T> =
  | { ok: true; data: T }
  | {
      ok: false
      reason: ModelOutputFailure
      /**
       * Ready-made, payload-free log line: a reason enum, the provider stop
       * reason, and a character count. Built here precisely so no call site has
       * to touch the raw text to say why it failed (A7).
       */
      logDetail: string
    }

/**
 * The ONE strict parse of a model's JSON reply: `safeParse`, never a cast
 * (HANDOFF convention). Returns a discriminated result — callers map it to their
 * own error response and log `logDetail`.
 */
export function parseModelOutput<S extends z.ZodTypeAny>(
  message: ModelReply,
  schema: S,
): ModelOutput<z.infer<S>> {
  const stop = message.stop_reason ?? null
  // Truncation is a FAILURE, not a shape. `max_tokens` cuts the reply mid-value;
  // a prefix that still happens to parse is a SMALLER answer wearing a valid
  // shape — five graded questions arriving as one, and the aggregate scored
  // against it. Reject before parsing so that can never be a judgement call.
  return parseModelJson(firstText(message), schema, stop)
}

/**
 * The same strict parse for text a caller already has in hand — the streaming
 * paths accumulate their own `text_delta`s and never hold a `Message`.
 */
export function parseModelJson<S extends z.ZodTypeAny>(
  raw: string,
  schema: S,
  stopReason: string | null = null,
): ModelOutput<z.infer<S>> {
  type T = z.infer<S>
  const fail = (reason: ModelOutputFailure): ModelOutput<T> => ({
    ok: false,
    reason,
    logDetail: `reason=${reason} stop=${stopReason ?? 'none'} len=${raw.length}`,
  })

  if (stopReason === 'max_tokens') return fail('truncated')
  if (!raw) return fail('no_text')
  const span = raw.match(/[[{][\s\S]*[\]}]/)
  if (!span) return fail('no_json')
  let json: unknown
  try {
    json = JSON.parse(span[0])
  } catch {
    return fail('no_json')
  }
  const parsed = schema.safeParse(json)
  return parsed.success ? { ok: true, data: parsed.data } : fail('shape')
}
