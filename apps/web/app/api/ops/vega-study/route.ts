import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { buildStudyContext, STUDY_INSTRUCTIONS } from '@/lib/ops/vega-study-context'
import { anthropic } from '@/lib/anthropic'
import { buildChatTurns, runChatTurn } from '@/lib/chat/thread'

// The server owns the team's shared study thread. A request carries ONE new user
// turn; history is loaded from the database (keyed by teamId only — team-shared),
// so a client can never inject fabricated assistant turns. Bounded to MAX_MESSAGES.
const MAX_MESSAGES = 60
const MAX_MESSAGE_CHARS = 8_000
const ChatBody = z.object({ message: z.string().trim().min(1).max(MAX_MESSAGE_CHARS) }).strict()

// GET: the team's shared study-thread history, capped at the last MAX_MESSAGES.
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const rows = await db.vegaStudyMessage.findMany({
    where: { teamId: ctx.teamId, status: 'complete' },
    orderBy: { createdAt: 'desc' },
    take: MAX_MESSAGES,
    select: { role: true, content: true },
  })

  return NextResponse.json({ messages: rows.reverse() })
}

export async function POST(req: NextRequest) {
  // Strict per-user + per-IP limit: this handler makes a paid Claude call.
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'ai' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, ChatBody)
  if (error) return error
  const message = data.message

  // Server-owned, bounded history (only completed turns). Begins with a user turn.
  const prior = await db.vegaStudyMessage.findMany({
    where: { teamId: ctx.teamId, status: 'complete' },
    orderBy: { createdAt: 'desc' },
    take: MAX_MESSAGES,
    select: { role: true, content: true },
  })
  // Team-shared: concurrent teammate posts interleave user/assistant rows by
  // createdAt, so the bounded window can begin on an assistant turn — see
  // buildChatTurns for the trim + BLK-6 cache_control breakpoints.
  const convo = buildChatTurns(prior, message)

  const result = await runChatTurn({
    createPending: (requestId) =>
      db.vegaStudyMessage.create({
        data: {
          teamId: ctx.teamId,
          userId: ctx.dbUserId,
          role: 'user',
          content: message,
          status: 'pending',
          requestId,
        },
        select: { id: true },
      }),
    callAnthropic: async () => {
      // E2E test-mode short-circuit: skip the real Anthropic call when E2E_SKIP_LLM=1
      // (set by the Playwright config, never in a normal dev server or production).
      if (process.env.E2E_SKIP_LLM === '1') {
        return {
          reply:
            "That's a great question to dig into — but I can't write that deliverable for you. Let's work through it together: what's the core idea you're trying to explain, in your own words?",
          usageJson: undefined,
        }
      }
      const context = await buildStudyContext(ctx.teamId)
      const response = await anthropic().messages.create({
        model: 'claude-sonnet-5',
        // Sonnet 5 runs adaptive thinking when `thinking` is omitted (4.6 did not),
        // and thinking shares this `max_tokens` budget. Disabled to preserve the
        // cost, latency, and output length this route was tuned for.
        // `max_tokens` was also raised ~1.5x: Sonnet 5's tokenizer
        // spends ~30% more tokens on the same text, so a budget tuned against
        // 4.6 truncates. That is not a visible error — it silently cuts the
        // response mid-sentence (it broke idea-check's JSON verdict outright).
        thinking: { type: 'disabled' },
        max_tokens: 1536,
        system: [
          { type: 'text', text: STUDY_INSTRUCTIONS },
          { type: 'text', text: context, cache_control: { type: 'ephemeral' } },
        ],
        messages: convo,
      })
      const reply = response.content[0].type === 'text' ? response.content[0].text : ''
      return {
        reply,
        usageJson: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      }
    },
    onError: (err) => console.error('[vega-study] error:', err),
    markError: (userRowId) =>
      db.vegaStudyMessage.update({ where: { id: userRowId }, data: { status: 'error', error: 'Chat failed' } }),
    complete: (userRowId, usageJson, reply, requestId) =>
      db.$transaction([
        db.vegaStudyMessage.update({
          where: { id: userRowId },
          data: { status: 'complete', tokenUsageJson: usageJson },
        }),
        db.vegaStudyMessage.create({
          data: {
            teamId: ctx.teamId,
            userId: ctx.dbUserId,
            role: 'assistant',
            content: reply,
            status: 'complete',
            requestId,
            tokenUsageJson: usageJson,
          },
        }),
      ]),
  })

  if (!result.ok) return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  return NextResponse.json({ reply: result.reply })
}
