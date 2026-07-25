import 'server-only'
import { createHash } from 'crypto'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { recommendTracks } from '@/lib/ops/codex/study-plan'
import { CODEX_TRACKS } from '@/lib/ops/codex/index'
import { aiIdempotencyKey, runAiOperation } from '@/lib/ai/operation'
import { todayUtc } from '@/lib/date'

/**
 * Study-plan application service (Track B P1-2, §3.2 E) — the workflows
 * behind `/api/ops/codex/study-plan`: sourceHash-cached generation with an
 * atomic daily re-run cap, and manual track add/remove. The route is a thin
 * adapter.
 *
 * RE-RUN CAP ATOMICITY: a re-run cap of 2/team/day is enforced by an atomic
 * guarded `INSERT ... ON CONFLICT DO UPDATE ... WHERE ... RETURNING`
 * executed BEFORE `recommendTracks()` (the paid Haiku call) — mirroring the
 * exact pattern used for the lesson daily-cap in `complete-service.ts`. The
 * UPDATE's WHERE clause re-evaluates the CURRENT row atomically as part of
 * the same statement, so two concurrent calls can never both observe "under
 * cap" and both fire a real paid LLM call — only one can ever claim the last
 * slot; the other's `RETURNING` set is empty and it 429s immediately without
 * ever calling `recommendTracks`.
 *
 * SLOT-RESERVATION CHOICE (the cap is "spend, not refund" on an LLM
 * failure): the slot is reserved BEFORE the LLM call runs, so if
 * `recommendTracks` throws, the reserved slot is still consumed — we do NOT
 * roll the counter back on error. This is the deliberate, documented choice:
 * refunding on error would require a second write after the failure (racy
 * against a THIRD concurrent request that reserved the next slot in the
 * meantime, and reopens the same class of bug this fix closes), and
 * `recommendTracks` itself already never throws in the way that would make
 * this costly — it catches its own call/parse failures internally and
 * returns a safe default recommendation rather than throwing (see
 * `lib/ops/codex/study-plan.ts`).
 *
 * VERSIONED WRITEBACK (P1-S9): reserving the slot also stamps
 * `pendingSourceHash` with the source this generation is working from, and the
 * commit is a compare-and-set on it. Haiku takes seconds; in that window the
 * team can edit its topic and a second generation can finish. Without the CAS
 * the slower, older result overwrote the newer one. The paid call itself runs
 * through `runAiOperation`, so two callers that both miss the row-level cache
 * with identical input share one result instead of buying two.
 */

/** Re-run cap for the study-plan classifier — the LLM rate cap on top of the 'ai' tier limiter. */
const STUDY_PLAN_DAILY_RUN_CAP = 2

export interface StudyPlanPrincipal {
  teamId: string
}

export type GenerateStudyPlanResult =
  | { ok: false; error: string; status: number }
  | {
      ok: true
      tracks: unknown
      manualTrackSlugs: string[]
      generatedAt: string
      cached: boolean
    }

function sourceHashOf(topic: string | null, researchIdea: string | null, planText: string | null): string {
  return createHash('sha256')
    .update(`${topic ?? ''}\u001f${researchIdea ?? ''}\u001f${(planText ?? '').slice(0, 8000)}`)
    .digest('hex')
}

/**
 * Generate or regenerate the team's Study Plan. Computes a `sourceHash` from
 * the team's topic + researchIdea + research-plan text; if the stored plan's
 * hash is unchanged, returns the cached plan with NO LLM call (cost
 * discipline) and no cap consumed.
 */
export async function generateStudyPlan(
  principal: StudyPlanPrincipal,
): Promise<GenerateStudyPlanResult> {
  const team = await db.team.findUnique({
    where: { id: principal.teamId },
    select: { topic: true, researchIdea: true, labType: true },
  })
  if (!team) {
    return { ok: false, error: 'Team not found', status: 404 }
  }
  const researchPlan = await db.researchPlan.findUnique({
    where: { teamId: principal.teamId },
    select: { lastSyncedText: true },
  })

  const sourceHash = sourceHashOf(team.topic, team.researchIdea, researchPlan?.lastSyncedText ?? null)

  const existing = await db.teamStudyPlan.findUnique({
    where: { teamId: principal.teamId },
    select: { tracksJson: true, sourceHash: true, generatedAt: true, manualTrackSlugs: true },
  })

  // Cached hit — no LLM call, no cap consumed.
  if (existing && existing.sourceHash === sourceHash) {
    return {
      ok: true,
      tracks: existing.tracksJson,
      manualTrackSlugs: existing.manualTrackSlugs,
      generatedAt: existing.generatedAt.toISOString(),
      cached: true,
    }
  }

  const today = todayUtc()

  // Atomically reserve ONE re-run slot for today, BEFORE the LLM call. The
  // day resets the counter to 1 when `runs_day` isn't today; otherwise it
  // increments — but ONLY when the row doesn't already exist, OR the
  // existing row's runs_day isn't today (a fresh day), OR today's count is
  // still under the cap. A losing concurrent request's RETURNING set is
  // empty, exactly the field-dispatch/lesson-cap safety property.
  const reserved = await db.$queryRaw<{ runs_today: number }[]>(Prisma.sql`
    INSERT INTO "team_study_plans" (team_id, tracks_json, source_hash, pending_source_hash, runs_today, runs_day, generated_at, updated_at)
    VALUES (${principal.teamId}, '[]'::jsonb, '', ${sourceHash}, 1, ${today}, now(), now())
    ON CONFLICT (team_id) DO UPDATE
      SET runs_today = CASE
            WHEN "team_study_plans".runs_day IS DISTINCT FROM ${today} THEN 1
            ELSE "team_study_plans".runs_today + 1
          END,
          runs_day = ${today},
          -- Stamp the source this generation works from (P1-S9). A later
          -- generation overwrites it, which is exactly what makes the commit's
          -- compare-and-set discard the earlier, staler result.
          pending_source_hash = ${sourceHash},
          updated_at = now()
      WHERE "team_study_plans".runs_day IS DISTINCT FROM ${today}
         OR "team_study_plans".runs_today < ${STUDY_PLAN_DAILY_RUN_CAP}
    RETURNING runs_today
  `)

  if (reserved.length === 0) {
    return {
      ok: false,
      error: 'Study Plan can only be regenerated twice per day. Try again tomorrow.',
      status: 429,
    }
  }

  // Run the paid classifier at most once per (team, source) and replay its
  // result to an identical concurrent caller (P1-S9 via the P1-R3 ledger). The
  // row-level `sourceHash` cache above catches the sequential repeat; this
  // catches two clicks that both miss it.
  const op = await runAiOperation({
    operation: 'study_plan_tracks',
    idempotencyKey: aiIdempotencyKey(['study_plan_tracks', principal.teamId, sourceHash]),
    teamId: principal.teamId,
    run: () =>
      recommendTracks({
        topic: team.topic,
        researchIdea: team.researchIdea,
        planText: researchPlan?.lastSyncedText ?? null,
        labType: team.labType,
      }),
  })
  if (!op.ok) {
    if (op.reason === 'in_flight') {
      return { ok: false, error: 'Your Study Plan is already being generated — give it a moment.', status: 409 }
    }
    throw op.error
  }

  // Validate returned slugs against CODEX_TRACKS (recommendTracks already
  // constrains this, but re-validate defensively at the persistence
  // boundary — never trust a single layer).
  const validSlugs = new Set(CODEX_TRACKS.map((t) => t.slug))
  const cleanedTracks = op.result.filter((r) => validSlugs.has(r.trackSlug))

  // COMPARE-AND-SET on the source this generation reserved against (P1-S9),
  // not an unconditional update. The slot (runsToday/runsDay) is already
  // reserved above, so this write never re-touches the cap counters — and the
  // `pending_source_hash` predicate means a generation started against an older
  // topic cannot land on top of a newer one that already finished.
  const committed = await db.teamStudyPlan.updateMany({
    where: { teamId: principal.teamId, pendingSourceHash: sourceHash },
    data: {
      tracksJson: cleanedTracks as unknown as Prisma.InputJsonValue,
      sourceHash,
      generatedAt: new Date(),
    },
  })

  const saved = await db.teamStudyPlan.findUnique({
    where: { teamId: principal.teamId },
    select: { tracksJson: true, manualTrackSlugs: true, generatedAt: true },
  })
  if (!saved) return { ok: false, error: 'Study plan not found', status: 404 }

  return {
    ok: true,
    tracks: saved.tracksJson,
    manualTrackSlugs: saved.manualTrackSlugs,
    generatedAt: saved.generatedAt.toISOString(),
    // A lost CAS means a newer generation already published; the caller gets
    // that plan, and honestly labelled as not freshly generated for them.
    cached: committed.count !== 1,
  }
}

export type ManualTrackResult =
  | { ok: false; error: string; status: number }
  | { ok: true; manualTrackSlugs: string[] }

/**
 * Add/remove a manual track selection. Team-scoped upsert on
 * `manualTrackSlugs`; unknown slugs are rejected.
 */
export async function setManualTrackSelection(
  principal: StudyPlanPrincipal,
  input: { action: 'add' | 'remove'; trackSlug: string },
): Promise<ManualTrackResult> {
  const validSlugs = new Set(CODEX_TRACKS.map((t) => t.slug))
  if (!validSlugs.has(input.trackSlug)) {
    return { ok: false, error: 'Unknown track slug', status: 400 }
  }

  const existing = await db.teamStudyPlan.findUnique({
    where: { teamId: principal.teamId },
    select: { manualTrackSlugs: true },
  })
  const current = existing?.manualTrackSlugs ?? []
  const next =
    input.action === 'add'
      ? Array.from(new Set([...current, input.trackSlug]))
      : current.filter((s) => s !== input.trackSlug)

  const saved = await db.teamStudyPlan.upsert({
    where: { teamId: principal.teamId },
    create: {
      teamId: principal.teamId,
      tracksJson: [],
      sourceHash: '',
      manualTrackSlugs: next,
    },
    update: { manualTrackSlugs: next },
    select: { manualTrackSlugs: true },
  })

  return { ok: true, manualTrackSlugs: saved.manualTrackSlugs }
}
