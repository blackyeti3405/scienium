import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { differenceInCalendarDays } from 'date-fns'
import { requireTeamContext } from '@/lib/api/route-context'
import { FAIRS, type SeedFair } from '@/content/fairs/dataset'
import { STATE_CENTROIDS, haversineMiles } from '@/lib/fairs/zip'
import { db } from '@/lib/db'

/**
 * GET /api/team/momentum — a team's rolling last-7-days recap for the lab's
 * "Momentum" card: KP earned, sources reviewed, logs written, experiments +
 * data points added, and days to the next fair. Pure aggregate: no writes, no
 * Anthropic call, no new tables. Scoped entirely by ctx.teamId (+ the team's
 * own member ids for the user-keyed KP ledger below).
 *
 * No `feature` gate — momentum is phase-agnostic and shows on the lab in any
 * phase.
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Everything the card needs in ONE round-trip. This used to be a member
  // lookup + a 7-query Promise.all, but connection_limit=1 through PgBouncer
  // makes Promise.all fan-outs run serially (latency = sum of 8 queries), so
  // the counts/sums are folded into scalar subselects on the team row (PERF-1).
  // The codex KP subselect scopes to the team's member ids inline — some KP
  // ledgers (CodexLessonProgress) are keyed by user, not team.
  const rows = await db.$queryRaw<
    {
      sources_reviewed: number
      logs_written: number
      experiments_added: number
      points_added: number
      discovery_kp: number
      codex_kp: number
      location_state: string | null
      location_lat: number | null
      location_lng: number | null
    }[]
  >(Prisma.sql`
    SELECT
      (SELECT COUNT(*) FROM "discovery_source_visits" v
        WHERE v.team_id = ${ctx.teamId} AND v.created_at >= ${since})::int AS sources_reviewed,
      (SELECT COUNT(*) FROM "project_logs" l
        WHERE l.team_id = ${ctx.teamId} AND l.created_at >= ${since})::int AS logs_written,
      (SELECT COUNT(*) FROM "experiments" e
        WHERE e.team_id = ${ctx.teamId} AND e.created_at >= ${since})::int AS experiments_added,
      (SELECT COUNT(*) FROM "measurements" m
        JOIN "experiments" e ON e.id = m.experiment_id
        WHERE e.team_id = ${ctx.teamId} AND m.recorded_at >= ${since})::int AS points_added,
      -- kpEarned: sum ONLY the timestamped, per-award KP ledgers (see note below).
      (SELECT COALESCE(SUM(v.kp_awarded), 0) FROM "discovery_source_visits" v
        WHERE v.team_id = ${ctx.teamId} AND v.created_at >= ${since})::int AS discovery_kp,
      -- completed_at is stamped exactly when kp_awarded is minted (once per
      -- lesson), so it works as the per-award timestamp for the rolling window.
      (SELECT COALESCE(SUM(p.kp_awarded), 0) FROM "codex_lesson_progress" p
        WHERE p.team_id = ${ctx.teamId}
          AND p.user_id IN (SELECT tm.user_id FROM "team_members" tm WHERE tm.team_id = ${ctx.teamId})
          AND p.kp_awarded > 0
          AND p.completed_at >= ${since})::int AS codex_kp,
      t.location_state, t.location_lat, t.location_lng
    FROM "teams" t
    WHERE t.id = ${ctx.teamId}
  `)
  const row = rows[0] ?? null

  // KP-window note (load-bearing — do not "fix" this by adding more sources):
  // there is no single team-wide, per-award KP ledger. The timestamped, indexed
  // KP sources are DiscoverySourceVisit.kpAwarded (@@index([teamId, createdAt]))
  // and CodexLessonProgress.kpAwarded (user-keyed; completedAt is set exactly
  // when the award is minted, once per lesson).
  // PaperProficiency.kpAwarded is a high-water mark with only updatedAt (no
  // per-award row), so quiz KP over a rolling window is not cleanly attributable
  // and is deliberately EXCLUDED rather than double-counted or guessed.
  // DiscoveryKpDay is a per-day rollup of the SAME discovery KP already summed
  // via DiscoverySourceVisit, so it is NOT added either (would double count) —
  // same for CodexKpDay, which counts completions, not KP.
  const kpEarned = (row?.discovery_kp ?? 0) + (row?.codex_kp ?? 0)

  const teamCoords: readonly [number, number] | null =
    row?.location_lat != null && row?.location_lng != null
      ? [row.location_lat, row.location_lng]
      : null
  const { daysToNextFair, nextFairName } = nextFairFromDataset(row?.location_state ?? null, teamCoords)

  return NextResponse.json({
    windowDays: 7,
    kpEarned,
    sourcesReviewed: row?.sources_reviewed ?? 0,
    logsWritten: row?.logs_written ?? 0,
    experimentsAdded: row?.experiments_added ?? 0,
    pointsAdded: row?.points_added ?? 0,
    daysToNextFair,
    nextFairName,
  })
}

/**
 * Compute the nearest upcoming dated fair for a team's location, replicating
 * the EXACT selection semantics the Fair Hub shows the same team
 * (ScienceFairFeature.tsx's `nextFairCountdown`, which only ever considers
 * `[match.regional, match.stateFair, match.isef]` — the single NEAREST
 * regional, never `otherRegionals`) — sourced purely from the FAIRS dataset
 * literal (content/fairs/dataset.ts) already resident in memory, deliberately
 * bypassing matchFairs()/ensureFairsSeeded() (lib/fairs/match.ts).
 * (Historical reason, now obsolete: ensureFairsSeeded used to re-run a ~266-row
 * sequential upsert loop and hang /api/fairs/match. It has been batched and
 * single-flighted since, and as of P1-R16 a process that has already reconciled
 * the current edition returns from it with zero queries.) Momentum is ambient
 * lab chrome that must return fast on every load; the local replica is kept for
 * now because it is a pure in-memory read, not because the seeder is unsafe.
 *
 * Nearest-regional selection mirrors matchFairs() line-for-line: prefer the
 * team's stored geocoded coords (`Team.locationLat/Lng`, already resident on
 * the SAME row this route reads for `locationState` — set once at
 * onboarding/location-update via a network geocode, never re-geocoded per
 * request) and fall back to the state centroid
 * (`STATE_CENTROIDS[state]`) exactly like `const teamPoint = coords ??
 * STATE_CENTROIDS[state] ?? null` in lib/fairs/match.ts. All regionals in the
 * team's state are then sorted by `haversineMiles` ascending and only the
 * first (nearest) is kept as a candidate — `otherRegionals` are intentionally
 * discarded, matching the hub's candidate set.
 *
 * STALENESS NOTE — still true, and now the only reason to replace this: it
 * reads the static FAIRS dataset literal, not the `FairEvent` DB rows that
 * /api/fairs/[id]/sync-deadlines corrects in place (Firecrawl-sourced date
 * fixes). So a crawled correction is invisible here while the Fair Hub shows
 * it. The seeding path that used to make switching impossible is fixed, so
 * this route CAN now call matchFairs() directly — a deliberate follow-up, not
 * a blocked one.
 */
function nextFairFromDataset(
  state: string | null,
  coords: readonly [number, number] | null,
): { daysToNextFair: number | null; nextFairName: string | null } {
  const isef = FAIRS.find((f) => f.level === 'international') ?? null
  const candidates: SeedFair[] = isef ? [isef] : []

  if (state) {
    const stateFair = FAIRS.find((f) => f.level === 'state' && f.state === state)
    if (stateFair) candidates.push(stateFair)

    // Prefer geocoded coords (stored on the team) > state centroid fallback —
    // same fallback chain as matchFairs().
    const teamPoint = coords ?? STATE_CENTROIDS[state] ?? null
    const regionals = FAIRS.filter((f) => f.level === 'regional' && f.state === state)
    const nearestRegional = teamPoint
      ? [...regionals].sort(
          (a, b) =>
            haversineMiles(teamPoint, [a.latitude, a.longitude]) -
            haversineMiles(teamPoint, [b.latitude, b.longitude]),
        )[0]
      : regionals[0]
    if (nearestRegional) candidates.push(nearestRegional)
  }

  const now = new Date()
  let best: { name: string; daysUntil: number } | null = null
  for (const fair of candidates) {
    if (!fair.eventDate) continue
    const daysUntil = differenceInCalendarDays(new Date(fair.eventDate), now)
    if (daysUntil < 0) continue
    if (best === null || daysUntil < best.daysUntil) best = { name: fair.name, daysUntil }
  }

  return best
    ? { daysToNextFair: best.daysUntil, nextFairName: best.name }
    : { daysToNextFair: null, nextFairName: null }
}
