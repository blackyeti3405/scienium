import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { requireTeamContext } from '@/lib/api/route-context'
import { IDEA_CHECK_DAILY_LIMIT, ideaChecksUsedToday } from '@/lib/research-plan/idea-check'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

// Server-side only; the Anthropic key is never exposed to the client.
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * POST /api/research-plan/idea-check — "Has this idea been done before?" (Feature 2C).
 *
 * Streams NDJSON so the UI can show the web searches AS THEY HAPPEN (each query +
 * the sources it returns), not just the final verdict. Runs Claude with the
 * Anthropic native web-search tool (`web_search_20260209`) over the team's synced
 * plan; rate-limited 3/day per team. Pre-flight checks return normal JSON errors;
 * once streaming starts, problems arrive as `{ type: 'error' }` events.
 */
export async function POST(req: NextRequest) {
  // Per-minute burst cap on top of the 3/day-per-team cap below: stops a single
  // caller from racing many concurrent web-search runs before the daily counter
  // catches up (each run is a multi-search paid Claude call).
  const { ctx, error } = await requireTeamContext(req, { tier: 'ai' })
  if (error) return error

  const usedToday = await ideaChecksUsedToday(ctx.teamId)
  if (usedToday >= IDEA_CHECK_DAILY_LIMIT) {
    return NextResponse.json(
      { error: `Your team has used all ${IDEA_CHECK_DAILY_LIMIT} idea checks for today` },
      { status: 429 },
    )
  }

  const plan = await db.researchPlan.findUnique({ where: { teamId: ctx.teamId } })
  if (!plan?.lastSyncedText) {
    return NextResponse.json({ error: 'Connect and sync a Google Doc first' }, { status: 400 })
  }

  const planText = plan.lastSyncedText.slice(0, 12000)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))

      try {
        send({ type: 'status', message: 'Reading your plan…' })

        const messages: Anthropic.MessageParam[] = [
          {
            role: 'user',
            content: `Here is our research plan. Determine whether this idea has been done before, then answer in the required JSON.\n\n---\n${planText}`,
          },
        ]

        const seen = new Set<string>()
        const sources: { title: string; url: string }[] = []
        let verdictText = ''

        // Server-side web search may return `pause_turn`; loop until it finishes.
        for (let turn = 0; turn < 5; turn++) {
          verdictText = ''
          // Cast events to a loose shape — server-tool streaming blocks aren't
          // fully covered by the SDK's narrowed event union.
          const ms = client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: IDEA_CHECK_SYSTEM,
            tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }],
            messages,
          })

          const blocks = new Map<number, { type?: string; name?: string; json: string; emitted: boolean }>()

          for await (const event of ms as AsyncIterable<Record<string, any>>) {
            if (event.type === 'content_block_start') {
              const cb = event.content_block ?? {}
              const b = { type: cb.type, name: cb.name, json: '', emitted: false }
              blocks.set(event.index, b)
              // The web-search query arrives on the block's `input` here (it does
              // not stream as input_json_delta for the server tool).
              if (cb.type === 'server_tool_use' && cb.name === 'web_search' && cb.input?.query) {
                send({ type: 'search', query: String(cb.input.query) })
                b.emitted = true
              }
              if (cb.type === 'web_search_tool_result' && Array.isArray(cb.content)) {
                emitSources(cb.content)
              }
            } else if (event.type === 'content_block_delta') {
              const d = event.delta ?? {}
              if (d.type === 'input_json_delta') {
                const b = blocks.get(event.index)
                if (b) b.json += d.partial_json ?? ''
              } else if (d.type === 'text_delta') {
                verdictText += d.text ?? ''
              }
            } else if (event.type === 'content_block_stop') {
              const b = blocks.get(event.index)
              if (b?.type === 'server_tool_use' && b.name === 'web_search' && !b.emitted) {
                try {
                  const q = JSON.parse(b.json)
                  if (q.query) send({ type: 'search', query: String(q.query) })
                } catch {
                  /* partial — ignore */
                }
              }
            }
          }

          const final = await ms.finalMessage()
          // Belt-and-suspenders: pull any sources the start event didn't carry.
          for (const block of final.content as Array<Record<string, any>>) {
            if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
              emitSources(block.content)
            }
          }

          if (final.stop_reason === 'pause_turn') {
            messages.push({ role: 'assistant', content: final.content })
            continue
          }
          break
        }

        function emitSources(content: Array<Record<string, any>>) {
          const items: { title: string; url: string }[] = []
          for (const r of content) {
            if (r.type === 'web_search_result' && r.url && !seen.has(r.url)) {
              seen.add(r.url)
              const item = { title: r.title ?? r.url, url: r.url }
              sources.push(item)
              items.push(item)
            }
          }
          if (items.length) send({ type: 'sources', items })
        }

        // Parse the final JSON verdict.
        const match = verdictText.match(/\{[\s\S]*\}/)
        let parsed: ParsedVerdict | null = null
        if (match) {
          try {
            parsed = JSON.parse(match[0]) as ParsedVerdict
          } catch {
            parsed = null
          }
        }
        if (!parsed) {
          send({ type: 'error', error: 'Could not interpret the result — try again' })
          return
        }

        const verdict = ['novel', 'refine', 'reject'].includes(parsed.verdict)
          ? parsed.verdict
          : 'refine'
        const findings = {
          summary: parsed.summary ?? '',
          priorWork: Array.isArray(parsed.priorWork) ? parsed.priorWork.slice(0, 8) : [],
          differentiation: parsed.differentiation ?? '',
          recommendation: parsed.recommendation ?? '',
          citations: sources.slice(0, 10),
        }

        // Ledger row (rate-limit counting) + replace the plan's current result so
        // it persists across reloads and overwrites the previous one.
        await db.ideaCheck.create({
          data: {
            teamId: ctx.teamId,
            userId: ctx.dbUserId,
            verdict,
            findingsJson: findings as unknown as Prisma.InputJsonValue,
          },
        })
        await db.researchPlan.update({
          where: { teamId: ctx.teamId },
          data: {
            lastIdeaCheckJson: { verdict, findings } as unknown as Prisma.InputJsonValue,
            lastIdeaCheckAt: new Date(),
          },
        })

        send({
          type: 'done',
          verdict,
          findings,
          usedToday: usedToday + 1,
          limit: IDEA_CHECK_DAILY_LIMIT,
          remaining: Math.max(0, IDEA_CHECK_DAILY_LIMIT - usedToday - 1),
        })
      } catch (err) {
        console.error('[idea-check] failed:', err)
        send({ type: 'error', error: 'Idea check failed — try again' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

interface ParsedVerdict {
  verdict: string
  summary?: string
  priorWork?: { title?: string; url?: string; note?: string }[]
  differentiation?: string
  recommendation?: string
}

const IDEA_CHECK_SYSTEM = `You are Nova, helping an advanced high-school science-fair team check the originality of their research idea. You have a web search tool — use it.

STEPS:
1. From the research plan, identify the core idea/approach in one or two sentences.
2. Search the web (2–5 focused searches) for prior work: existing products, papers, prior science-fair projects, or commercial solutions that do something similar.
3. Judge novelty honestly. "Already done many times" → likely reject or refine; "done but our angle is meaningfully different" → refine; "no close prior art" → novel.

Then return ONLY this JSON object (no prose, no markdown fences):
{
  "verdict": "novel" | "refine" | "reject",
  "summary": "1-2 sentences: has this been done, and how much prior art exists",
  "priorWork": [ { "title": "...", "url": "...", "note": "what they did / how close it is" } ],
  "differentiation": "how THIS project could still differ or contribute, if at all",
  "recommendation": "concrete next step — refine the angle (how) or reject and pivot (why)"
}

Be encouraging but honest — finding prior art is normal and useful, not a failure.`
