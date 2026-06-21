import Anthropic from '@anthropic-ai/sdk'
import { LAB_TYPE_LABELS, type LabType } from '@/lib/phase'
import { db } from '@/lib/db'

/**
 * Field Dispatch (spec §7.1) — the daily ~2-minute discipline-flavoured tip /
 * case study that ends in one reflection question, rewarding KP.
 *
 * Content is generated ONCE per lab type per day and shared by every student of
 * that lab type — never per student — so the cost is at most 6 Haiku calls/day
 * (token efficiency, per the project's working prefs). The `(labType,
 * publishedDate)` unique constraint makes `ensureTodayDispatch` idempotent: the
 * weekly/daily cron pre-warms it, but a GET can lazily generate it too, so the
 * feature self-heals if a cron run is missed.
 */

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/** Flat KP awarded for answering the day's reflection (once per student/day). */
export const FIELD_DISPATCH_KP = 10

const LAB_TYPE_FLAVOR: Record<LabType, string> = {
  biocore: 'biology, ecology, genetics, and life sciences',
  chemworks: 'chemistry, reactions, materials, and formulations',
  volt_lab: 'engineering, electronics, robotics, and applied physical systems',
  terrabase: 'earth science, climate, geology, and atmospheric systems',
  mindframe: 'social science, psychology, cognitive science, and human behavior',
  axiom: 'mathematics, physics, and astronomy',
}

export interface DispatchContent {
  body: string
  reflectionQuestion: string
}

/** UTC midnight for `when` (default now) — the stable per-day key. */
export function dispatchDate(when: Date = new Date()): Date {
  return new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth(), when.getUTCDate()))
}

/**
 * Generate one day's dispatch for a lab type via Claude Haiku. Returns a short
 * narrative tip/case study and a single open reflection question, calibrated to
 * advanced high-school level. Falls back to a generic prompt on parse failure so
 * the daily loop is never blocked.
 */
export async function generateDispatch(labType: LabType): Promise<DispatchContent> {
  const flavor = LAB_TYPE_FLAVOR[labType]
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `You write a daily "Field Dispatch" for a science-fair learning game. Each dispatch is a short, vivid tip or real-world case study from ${flavor}, written for an advanced high-school student. Keep the body to 90–140 words, concrete and motivating, no headers or markdown. Then pose ONE open-ended reflection question (not yes/no) that connects the idea to the student's own project.

Return ONLY valid JSON: {"body": string, "reflectionQuestion": string}. No markdown fences, no extra text.`,
      messages: [
        {
          role: 'user',
          content: `Write today's Field Dispatch for the ${LAB_TYPE_LABELS[labType]} discipline (${flavor}).`,
        },
      ],
    })
    const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0]) as Partial<DispatchContent>
      if (parsed.body && parsed.reflectionQuestion) {
        return { body: parsed.body.trim(), reflectionQuestion: parsed.reflectionQuestion.trim() }
      }
    }
  } catch {
    // fall through to a safe default
  }
  return {
    body: `Every great ${LAB_TYPE_LABELS[labType]} project starts with careful observation. Today, look at your own work with fresh eyes and note one thing you took for granted.`,
    reflectionQuestion: 'What is one assumption in your project you could test more rigorously?',
  }
}

/**
 * Compute the calendar-consecutive answer streak from an array of UTC-midnight
 * `publishedDate` values the student has already answered.
 *
 * Rules:
 * - Count back from the most recent answered day, stepping one calendar day at
 *   a time; the first missing day breaks the streak.
 * - Anchor the walk at today's UTC day if today is in the set, otherwise at
 *   yesterday's day — so an unanswered "today" does NOT zero a streak the
 *   student can still extend.
 * - The `today` parameter defaults to `new Date()` and exists solely for
 *   deterministic unit testing.
 */
export function computeStreak(publishedDates: Date[], today: Date = new Date()): number {
  if (publishedDates.length === 0) return 0

  // Normalise every date to a UTC-midnight timestamp (number) for fast set lookup.
  const todayKey = dispatchDate(today).getTime()
  const answeredKeys = new Set(publishedDates.map((d) => dispatchDate(d).getTime()))

  // Determine starting point: today (if answered) or yesterday.
  const startKey = answeredKeys.has(todayKey) ? todayKey : todayKey - 86_400_000

  // If the start day itself was not answered, streak is 0.
  if (!answeredKeys.has(startKey)) return 0

  let streak = 0
  let cursor = startKey
  while (answeredKeys.has(cursor)) {
    streak++
    cursor -= 86_400_000
  }
  return streak
}

/**
 * Return today's dispatch for a lab type, generating and persisting it if it
 * doesn't exist yet. Idempotent under the `(labType, publishedDate)` unique
 * constraint — a lost race re-reads the winner's row rather than duplicating.
 */
export async function ensureTodayDispatch(labType: LabType) {
  const publishedDate = dispatchDate()
  const existing = await db.fieldDispatchContent.findUnique({
    where: { labType_publishedDate: { labType, publishedDate } },
  })
  if (existing) return existing

  const content = await generateDispatch(labType)
  try {
    return await db.fieldDispatchContent.create({
      data: { labType, publishedDate, ...content },
    })
  } catch {
    // Likely a unique-constraint race — another request created it first.
    const winner = await db.fieldDispatchContent.findUnique({
      where: { labType_publishedDate: { labType, publishedDate } },
    })
    if (winner) return winner
    throw new Error('Failed to create field dispatch')
  }
}
