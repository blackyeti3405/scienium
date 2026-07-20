import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { serverEnv } from '@/lib/env'
import { logEvent } from '@/lib/observability/log'

/**
 * Shared, lazily-constructed Anthropic client.
 *
 * Constructed + memoized on first call — never at import — so a missing
 * ANTHROPIC_API_KEY can't fail `next build` (which imports every route module)
 * or routes that never call the LLM. The key is validated by `serverEnv` at that
 * first call, with a clear error naming the missing var. Every LLM route shares
 * this one instance (all previously used identical `{ apiKey }`-only config).
 *
 * Every paid call is logged as a structured `llm.call` / `llm.stream` event
 * (model, duration, token usage, outcome) by instrumenting the shared client
 * here — call sites can't forget to record spend. Prompts and completions are
 * never logged (see lib/observability/log.ts).
 *
 * SERVER-ONLY: the key is read server-side and never shipped to the browser.
 */
let cached: Anthropic | undefined

function errDetail(err: unknown): string {
  if (err instanceof Anthropic.APIError) return `api_${err.status}`
  return err instanceof Error ? err.constructor.name : 'unknown'
}

/** Log the outcome of one LLM call/stream once it settles — never consumes or alters `settled`. */
function logOutcome(
  event: string,
  model: string,
  started: number,
  settled: Promise<{ usage?: { input_tokens?: number; output_tokens?: number } }>,
): void {
  settled.then(
    (msg) =>
      logEvent({
        event,
        provider: 'anthropic',
        model,
        durationMs: Date.now() - started,
        inputTokens: msg.usage?.input_tokens,
        outputTokens: msg.usage?.output_tokens,
        outcome: 'ok',
      }),
    (err) =>
      logEvent({
        event,
        provider: 'anthropic',
        model,
        durationMs: Date.now() - started,
        outcome: 'error',
        detail: errDetail(err),
      }),
  )
}

function instrument(client: Anthropic): Anthropic {
  const messages = client.messages
  const origCreate = messages.create.bind(messages)
  const origStream = messages.stream.bind(messages)

  messages.create = ((params: Anthropic.MessageCreateParams, opts?: unknown) => {
    const started = Date.now()
    const result = origCreate(params as never, opts as never)
    if (!params.stream) {
      // Observe the same promise the caller awaits — never consumes or alters it.
      logOutcome('llm.call', params.model, started, result as unknown as Promise<Anthropic.Message>)
    }
    return result
  }) as typeof messages.create

  messages.stream = ((params: Anthropic.MessageStreamParams, opts?: unknown) => {
    const started = Date.now()
    const stream = origStream(params as never, opts as never)
    // finalMessage() resolves once the stream ends (or rejects on abort/error);
    // it only registers listeners — the caller still owns consumption.
    logOutcome('llm.stream', params.model, started, stream.finalMessage())
    return stream
  }) as typeof messages.stream

  return client
}

export function anthropic(): Anthropic {
  return (cached ??= instrument(new Anthropic({ apiKey: serverEnv.ANTHROPIC_API_KEY() })))
}
