import { differenceInCalendarDays } from 'date-fns'
import type { Phase } from '@/lib/phase'
import { CODEX_TRACKS, loadTrack } from '@/lib/ops/codex'
import { shopBuilding } from '@/lib/shop'

/**
 * Pure analytics for the teacher read routes (class reports + student
 * drill-down). Every function takes already-fetched rows as arguments — no db
 * access here — so the routes stay thin query-and-shape handlers and the
 * computations get a test seam.
 */

// ─── Class reports (GET /api/teacher/reports) ────────────────────────────────

/** KP distribution bucket boundaries — first cut, tuned for early-game economy scale. */
const KP_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: '0', min: 0, max: 0 },
  { label: '1-100', min: 1, max: 100 },
  { label: '101-300', min: 101, max: 300 },
  { label: '301-600', min: 301, max: 600 },
  { label: '601-1000', min: 601, max: 1000 },
  { label: '1000+', min: 1001, max: Infinity },
]

function bucketFor(kp: number): string {
  const bucket = KP_BUCKETS.find((b) => kp >= b.min && kp <= b.max)
  return bucket?.label ?? KP_BUCKETS[KP_BUCKETS.length - 1].label
}

/** A de-duped, class-scoped team as derived from the student roster rows. */
export interface ScopedTeam {
  id: string
  name: string
  phase: Phase
  createdAt: Date
}

interface StudentTeamRow {
  id: string
  name: string
  phase: string
  createdAt: Date
  classId: string | null
}

/**
 * De-duped teams from the scoped student set — the ONLY teams any report
 * aggregate may touch.
 *
 * IDOR scope: the caller passes students already filtered to the teacher's
 * classes (per-student membership), so every one of their teams is legitimately
 * in scope — a lab can span classes, and any owning teacher sees its team-level
 * aggregates. Ownership is NOT read off `Team.classId` (which is vestigial under
 * per-student membership).
 */
export function dedupeScopedTeams(
  students: {
    activeTeam: StudentTeamRow | null
    teamMemberships: { team: StudentTeamRow }[]
  }[],
): ScopedTeam[] {
  const teamMap = new Map<string, ScopedTeam>()
  for (const s of students) {
    const team = s.activeTeam ?? s.teamMemberships[0]?.team
    if (team) {
      teamMap.set(team.id, {
        id: team.id,
        name: team.name,
        phase: team.phase as Phase,
        createdAt: team.createdAt,
      })
    }
  }
  return [...teamMap.values()]
}

/** Phase distribution: how many teams sit in each phase. */
export function computePhaseCounts(teams: ScopedTeam[]): Record<string, number> {
  const phaseCounts: Record<string, number> = {}
  for (const t of teams) {
    phaseCounts[t.phase] = (phaseCounts[t.phase] ?? 0) + 1
  }
  return phaseCounts
}

/** KP distribution (bucketed histogram) across the scoped teams' currency rows. */
export function computeKpDistribution(kpRows: { kp: number }[]): { label: string; count: number }[] {
  const kpBucketCounts = new Map<string, number>(KP_BUCKETS.map((b) => [b.label, 0]))
  for (const row of kpRows) {
    const label = bucketFor(row.kp)
    kpBucketCounts.set(label, (kpBucketCounts.get(label) ?? 0) + 1)
  }
  return KP_BUCKETS.map((b) => ({ label: b.label, count: kpBucketCounts.get(b.label) ?? 0 }))
}

/**
 * Per-team proficiency heat-map summary.
 *
 * PaperProficiency has one row per (paper, student) — @@id([paperId, userId]) —
 * so counting rows directly would inflate papersMastered/papersInProgress by
 * team size. Instead, first roll every member's row up to one entry PER
 * DISTINCT PAPER per team (demonstrated = true if ANY member demonstrated it;
 * bestScore = the max across members), then bucket that per-paper rollup into
 * mastered / in-progress. avgBestScore stays a per-row mean (unaffected).
 */
export function computeTeamProficiency(
  teams: ScopedTeam[],
  proficiencyRows: {
    paperId: string
    demonstrated: boolean
    bestScore: number
    paper: { teamId: string }
  }[],
): { teamId: string; teamName: string; papersMastered: number; papersInProgress: number; avgBestScore: number }[] {
  const paperRollupByTeam = new Map<string, Map<string, { demonstrated: boolean; bestScore: number }>>()
  const scoreStatsByTeam = new Map<string, { scoreSum: number; scoreCount: number }>()
  for (const row of proficiencyRows) {
    const teamId = row.paper.teamId

    const papers = paperRollupByTeam.get(teamId) ?? new Map<string, { demonstrated: boolean; bestScore: number }>()
    const paper = papers.get(row.paperId) ?? { demonstrated: false, bestScore: 0 }
    paper.demonstrated = paper.demonstrated || row.demonstrated
    paper.bestScore = Math.max(paper.bestScore, row.bestScore)
    papers.set(row.paperId, paper)
    paperRollupByTeam.set(teamId, papers)

    if (row.bestScore > 0) {
      const stats = scoreStatsByTeam.get(teamId) ?? { scoreSum: 0, scoreCount: 0 }
      stats.scoreSum += row.bestScore
      stats.scoreCount += 1
      scoreStatsByTeam.set(teamId, stats)
    }
  }
  return teams.map((t) => {
    const papers = [...(paperRollupByTeam.get(t.id)?.values() ?? [])]
    const papersMastered = papers.filter((p) => p.demonstrated).length
    const papersInProgress = papers.filter((p) => !p.demonstrated && p.bestScore > 0).length
    const stats = scoreStatsByTeam.get(t.id)
    return {
      teamId: t.id,
      teamName: t.name,
      papersMastered,
      papersInProgress,
      avgBestScore: stats && stats.scoreCount > 0 ? Math.round(stats.scoreSum / stats.scoreCount) : 0,
    }
  })
}

/**
 * Phase pacing: days since the team was created. (Per-phase pacing used to
 * key off approved teacher advances; with self-paced advancement removed, the
 * team's age is the available proxy for "how long has this team been going".)
 */
export function computePhasePacing(
  teams: ScopedTeam[],
): { teamId: string; teamName: string; phase: Phase; daysInPhase: number }[] {
  const now = new Date()
  return teams
    .map((t) => {
      const since = t.createdAt
      return {
        teamId: t.id,
        teamName: t.name,
        phase: t.phase,
        daysInPhase: differenceInCalendarDays(now, since),
      }
    })
    .sort((a, b) => b.daysInPhase - a.daysInPhase)
}

// ─── Student drill-down (GET /api/teacher/student/[id]/overview) ─────────────

/** Member id → display-name lookup map from already-fetched team data. */
export function buildMemberNameMap(members: { user: { id: string; name: string } }[]): Map<string, string> {
  return new Map<string, string>(members.map((m) => [m.user.id, m.user.name]))
}

/** Enrich shop buildings with display name/description and purchaser name. */
export function enrichShopBuildings(
  shopBuildings: { buildingKey: string; purchasedByUserId: string; purchasedAt: Date }[],
  memberNameMap: Map<string, string>,
) {
  return shopBuildings.map((sb) => {
    const catalog = shopBuilding(sb.buildingKey)
    return {
      buildingKey: sb.buildingKey,
      name: catalog?.name ?? sb.buildingKey,
      description: catalog?.description ?? '',
      purchasedByName: memberNameMap.get(sb.purchasedByUserId) ?? null,
      purchasedAt: sb.purchasedAt,
    }
  })
}

/** Enrich gateway buildings with upgrader name. */
export function enrichTeamBuildings(
  teamBuildings: {
    currentLevel: number
    lastUpgradedAt: Date | null
    lastUpgradedByUserId: string | null
    building: { name: string }
  }[],
  memberNameMap: Map<string, string>,
) {
  return teamBuildings.map((tb) => ({
    name: tb.building.name,
    currentLevel: tb.currentLevel,
    lastUpgradedAt: tb.lastUpgradedAt,
    lastUpgradedByName: tb.lastUpgradedByUserId
      ? (memberNameMap.get(tb.lastUpgradedByUserId) ?? null)
      : null,
  }))
}

/**
 * Resolve lesson/track labels for the recent Codex completions. Track
 * modules are code-split; loading here only touches the (≤3) tracks in the
 * student's recent rows, and Node's module cache makes repeats free.
 */
export async function enrichCodexRecent(
  codexRecent: {
    trackSlug: string
    lessonId: string
    bestScore: number
    kpAwarded: number
    completedAt: Date | null
  }[],
) {
  const trackLabelBySlug = new Map(CODEX_TRACKS.map((t) => [t.slug, t.label]))
  const recentTrackSlugs = [...new Set(codexRecent.map((r) => r.trackSlug))]
  const lessonLabelById = new Map<string, string>()
  await Promise.all(
    recentTrackSlugs.map(async (slug) => {
      try {
        const track = await loadTrack(slug)
        for (const segment of [track.core, ...track.branches]) {
          for (const unit of segment.units) {
            for (const lesson of unit.lessons) lessonLabelById.set(lesson.id, lesson.label)
          }
        }
      } catch {
        // Unknown/retired slug — fall back to the raw lesson id below.
      }
    }),
  )
  return codexRecent.map((r) => ({
    trackLabel: trackLabelBySlug.get(r.trackSlug) ?? r.trackSlug,
    lessonLabel: lessonLabelById.get(r.lessonId) ?? r.lessonId,
    bestScore: r.bestScore,
    kpAwarded: r.kpAwarded,
    completedAt: r.completedAt,
  }))
}
