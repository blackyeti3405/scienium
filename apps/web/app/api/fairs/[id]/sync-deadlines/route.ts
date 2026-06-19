import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext } from '@/lib/phase'
import { db } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * POST /api/fairs/[id]/sync-deadlines — best-effort AI deadline extraction
 * (Feature 3c). Fetches the fair's public website, has Claude pull the upcoming
 * event date + deadlines, and upserts a FairEvent marked `estimated` (AI-read,
 * not human-verified). Deadline pages vary wildly per fair, so this is explicitly
 * a starting point that still needs per-fair verification.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const fair = await db.fair.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, websiteUrl: true },
  })
  if (!fair) return NextResponse.json({ error: 'Fair not found' }, { status: 404 })
  if (!fair.websiteUrl) {
    return NextResponse.json({ error: 'This fair has no website to read' }, { status: 400 })
  }

  // Fetch the page (bounded — fair sites occasionally hang or 403 a bot).
  let pageText = ''
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    const res = await fetch(fair.websiteUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (NOVA Lab fair-deadline reader)' },
    })
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`site returned ${res.status}`)
    const html = await res.text()
    pageText = htmlToText(html).slice(0, 16000)
  } catch (err) {
    return NextResponse.json(
      { error: `Could not read the fair's site — check it manually`, detail: String(err) },
      { status: 502 },
    )
  }

  if (!pageText.trim()) {
    return NextResponse.json({ error: 'The fair site had no readable text' }, { status: 422 })
  }

  const today = new Date().toISOString().slice(0, 10)
  let extracted: ExtractedDates | null = null
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: EXTRACTION_PROMPT(today),
      messages: [
        {
          role: 'user',
          content: `Fair: ${fair.name}\nToday: ${today}\n\nPAGE TEXT:\n---\n${pageText}`,
        },
      ],
    })
    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) extracted = JSON.parse(match[0]) as ExtractedDates
  } catch (err) {
    return NextResponse.json({ error: 'Could not extract dates', detail: String(err) }, { status: 502 })
  }

  if (!extracted || !extracted.year) {
    return NextResponse.json(
      { error: "Couldn't find clear dates on that page — please verify manually" },
      { status: 422 },
    )
  }

  const year = Number(extracted.year)
  const data = {
    eventDate: parseDate(extracted.eventDate),
    registrationDeadline: parseDate(extracted.registrationDeadline),
    abstractDeadline: parseDate(extracted.abstractDeadline),
    venue: extracted.venue?.slice(0, 200) ?? null,
    status: 'estimated' as const,
  }

  const existing = await db.fairEvent.findFirst({ where: { fairId: fair.id, year }, select: { id: true } })
  const event = existing
    ? await db.fairEvent.update({ where: { id: existing.id }, data })
    : await db.fairEvent.create({ data: { fairId: fair.id, year, ...data } })

  return NextResponse.json({
    event: {
      year: event.year,
      eventDate: event.eventDate?.toISOString() ?? null,
      registrationDeadline: event.registrationDeadline?.toISOString() ?? null,
      abstractDeadline: event.abstractDeadline?.toISOString() ?? null,
      venue: event.venue,
      status: 'estimated',
    },
  })
}

interface ExtractedDates {
  year?: number | string
  eventDate?: string | null
  registrationDeadline?: string | null
  abstractDeadline?: string | null
  venue?: string | null
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Crude HTML → text: drop scripts/styles/tags, collapse whitespace. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function EXTRACTION_PROMPT(today: string): string {
  return `You extract science-fair dates from a fair's webpage text. Today is ${today}.

Find the NEXT upcoming fair event (prefer the soonest date on/after today). Return ONLY a JSON object:
{
  "year": 2026,
  "eventDate": "YYYY-MM-DD or null",
  "registrationDeadline": "YYYY-MM-DD or null",
  "abstractDeadline": "YYYY-MM-DD or null",
  "venue": "short location string or null"
}

Rules:
- Use ISO YYYY-MM-DD. If only a month is given, use the first of that month.
- If a date is genuinely not present, use null — never guess.
- "year" is the calendar year of the event (required if any date is found).
- No prose outside the JSON object.`
}
