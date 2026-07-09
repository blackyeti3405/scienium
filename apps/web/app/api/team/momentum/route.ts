import { NextRequest, NextResponse } from 'next/server'
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

  // Some KP ledgers (CodexLessonProgress) are keyed by user, not team, so we
  // need the team's member ids to scope that read.
  const members = await db.teamMember.findMany({
    where: { teamId: ctx.teamId },
    select: { userId: true },
  })
  const memberIds = members.map((m) => m.userId)

  const [
    sourcesReviewed,
    logsWritten,
    experimentsAdded,
    pointsAdded,
    discoveryKp,
    codexKp,
    team,
  ] = await Promise.all([
    db.discoverySourceVisit.count({
      where: { teamId: ctx.teamId, createdAt: { gte: since } },
    }),
    db.projectLog.count({
      where: { teamId: ctx.teamId, createdAt: { gte: since } },
    }),
    db.experiment.count({
      where: { teamId: ctx.teamId, createdAt: { gte: since } },
    }),
    db.measurement.count({
      where: { recordedAt: { gte: since }, experiment: { teamId: ctx.teamId } },
    }),
    // ── kpEarned: sum ONLY the timestamped, per-award KP ledgers (see note below).
    db.discoverySourceVisit.aggregate({
      _sum: { kpAwarded: true },
      where: { teamId: ctx.teamId, createdAt: { gte: since } },
    }),
    // completedAt is stamped exactly when kpAwarded is minted (once per lesson),
    // so it works as the per-award timestamp for the rolling window.
    db.codexLessonProgress.aggregate({
      _sum: { kpAwarded: true },
      where: {
        teamId: ctx.teamId,
        userId: { in: memberIds },
        kpAwarded: { gt: 0 },
        completedAt: { gte: since },
      },
    }),
    db.team.findUnique({
      where: { id: ctx.teamId },
      select: { locationState: true, locationLat: true, locationLng: true },
    }),
  ])

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
  const kpEarned =
    (discoveryKp._sum.kpAwarded ?? 0) +
    (codexKp._sum.kpAwarded ?? 0)

  const teamCoords: readonly [number, number] | null =
    team?.locationLat != null && team?.locationLng != null
      ? [team.locationLat, team.locationLng]
      : null
  const { daysToNextFair, nextFairName } = nextFairFromDataset(team?.locationState ?? null, teamCoords)

  return NextResponse.json({
    windowDays: 7,
    kpEarned,
    sourcesReviewed,
    logsWritten,
    experimentsAdded,
    pointsAdded,
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
 * literal (lib/fairs/dataset.ts) already resident in memory, deliberately
 * bypassing matchFairs()/ensureFairsSeeded() (lib/fairs/match.ts).
 * ensureFairsSeeded re-runs a ~266-row sequential upsert loop on every call
 * while the seeded count is still short of FAIRS.length, which is exactly
 * what currently hangs /api/fairs/match, and matchFairs() calls it
 * unconditionally (not just from the route) — so calling matchFairs at all
 * here would inherit the same hang. Momentum is ambient lab chrome that must
 * return fast on every load, so it may never touch that seeding path.
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
 * STALENESS NOTE: this reads the static FAIRS dataset literal, not the
 * `FairEvent` DB rows that /api/fairs/[id]/sync-deadlines corrects in place
 * (Firecrawl-sourced date fixes). matchFairs() reads those corrected rows;
 * this function cannot without touching ensureFairsSeeded's seeding path,
 * which is currently only 70/266 seeded and hangs. Once the fairs-seeding fix
 * lands (separate task) this route should switch to calling matchFairs()
 * directly instead of this local replica.
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
