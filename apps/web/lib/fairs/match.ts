import 'server-only'
import { createHash } from 'crypto'
import { db } from '@/lib/db'
import { FAIRS, type SeedFairLevel } from '@/content/fairs/dataset'
import { resolveTeamPoint, haversineMiles } from '@/lib/fairs/zip'
import { logEvent } from '@/lib/observability/log'
import type { FairLevel, Prisma } from '@prisma/client'

/**
 * Fair matching (Feature 3b). Lazily mirrors the affiliated-fair dataset
 * (content/fairs/dataset.ts) into the Fair/FairEvent tables, then matches a team's
 * US location to its state fair, nearest regional fair, and ISEF.
 */

const LEVEL_MAP: Record<SeedFairLevel, FairLevel> = {
  international: 'international',
  state: 'state',
  regional: 'regional',
}

/**
 * Idempotently mirror the seed dataset into Fair/FairEvent — batched, so a full
 * reconcile is a handful of round trips instead of the old per-fair upsert loop
 * (~800 sequential queries against the remote DB; it hung /api/fairs/match for
 * 2+ minutes whenever the catalog was incomplete).
 *
 * REFACTOR2 P1-R16. This used to start with `count >= FAIRS.length → return`,
 * which meant a correction that did not change the ROW COUNT was invisible: a
 * renamed fair, moved coordinates, a fixed website, a swapped key, or a whole
 * same-size annual regen. The comments promised fall-drift repair that the fast
 * path prevented. The gate is now the authored edition's DIGEST, not its size.
 *
 * Shape:
 *  - Fast path: the dataset is a compile-time constant, so once this process has
 *    reconciled the database to `EDITION_DIGEST` there is nothing left to check
 *    and later calls cost ZERO queries — cheaper than the count it replaces.
 *    A new deploy is a new process with a new digest.
 *  - Missing fairs are inserted per level (international → state → regional) so
 *    a parent's id exists before its children reference it. `createMany` with
 *    `skipDuplicates` is race-safe across processes via the `seedKey` unique.
 *  - Existing fairs get targeted updates wherever their dataset fields drifted,
 *    and a key that reappears in the edition is un-retired.
 *  - Seeded keys no longer in the edition are RETIRED (`retiredAt`), not
 *    deleted: events, team interests, and notifications reference them, and a
 *    retired fair is still the true history of a team that entered it. Matching
 *    skips retired rows.
 *  - Events: missing (fairId, year) pairs are created. An existing row is
 *    updated ONLY while it is still a pure authored default — `estimated` AND
 *    its fair never crawled (`Fair.lastSyncedAt === null`). Once
 *    /api/fairs/[id]/sync-deadlines has corrected a fair, the static dataset
 *    never touches its dates again. That is the audit's "separate sourced
 *    defaults from local corrections", using the provenance v0.40.0 added. The
 *    (fairId, year) unique index (20260704051500) makes the createMany
 *    stampede-safe; the same migration deduped historical duplicate rows.
 *  - In-process callers share one run via a module-level single-flight promise,
 *    so a request stampede can't run the loop twice in parallel.
 */
let seedInFlight: Promise<void> | null = null
/** The edition this process has already reconciled the database to. */
let reconciledDigest: string | null = null

/**
 * Identifies the authored edition. Computed once at module load — `FAIRS` is a
 * static import, so this cannot change while the process lives.
 */
const EDITION_DIGEST = createHash('sha256').update(JSON.stringify(FAIRS)).digest('hex').slice(0, 16)

export function ensureFairsSeeded(): Promise<void> {
  if (reconciledDigest === EDITION_DIGEST) return Promise.resolve()
  if (!seedInFlight) {
    seedInFlight = seedFairsBatched().finally(() => {
      seedInFlight = null
    })
  }
  return seedInFlight
}

/** Test seam: forget that this process reconciled anything. */
export function resetFairSeedMemo(): void {
  reconciledDigest = null
  seedInFlight = null
}

const SEED_LEVELS = ['international', 'state', 'regional'] as const

async function seedFairsBatched(): Promise<void> {
  const existing = await db.fair.findMany({
    where: { seedKey: { not: null } },
    select: {
      id: true,
      seedKey: true,
      name: true,
      level: true,
      state: true,
      websiteUrl: true,
      latitude: true,
      longitude: true,
      parentFairId: true,
      retiredAt: true,
      // Provenance: a fair that has been crawled owns its own event dates.
      lastSyncedAt: true,
    },
  })
  const rowByKey = new Map(existing.map((f) => [f.seedKey as string, f]))
  const idByKey = new Map(existing.map((f) => [f.seedKey as string, f.id]))

  // Insert missing fairs level by level so parent ids resolve before children.
  for (const level of SEED_LEVELS) {
    const missing = FAIRS.filter((f) => f.level === level && !idByKey.has(f.key))
    if (missing.length === 0) continue
    await db.fair.createMany({
      data: missing.map((f) => ({
        seedKey: f.key,
        name: f.name,
        level: LEVEL_MAP[f.level],
        state: f.state,
        websiteUrl: f.websiteUrl,
        latitude: f.latitude,
        longitude: f.longitude,
        parentFairId: f.parentKey ? idByKey.get(f.parentKey) ?? null : null,
      })),
      skipDuplicates: true,
    })
    const created = await db.fair.findMany({
      where: { seedKey: { in: missing.map((f) => f.key) } },
      select: { id: true, seedKey: true },
    })
    for (const f of created) idByKey.set(f.seedKey as string, f.id)
  }

  // Targeted updates for rows whose dataset fields drifted. Reachable now: the
  // count fast path used to make a same-size correction unreachable.
  const updates: Prisma.PrismaPromise<unknown>[] = []
  for (const f of FAIRS) {
    const row = rowByKey.get(f.key)
    if (!row) continue
    const parentFairId = f.parentKey ? idByKey.get(f.parentKey) ?? null : null
    const drifted =
      row.name !== f.name ||
      row.level !== LEVEL_MAP[f.level] ||
      row.state !== f.state ||
      row.websiteUrl !== f.websiteUrl ||
      row.latitude !== f.latitude ||
      row.longitude !== f.longitude ||
      row.parentFairId !== parentFairId ||
      // A key that came back in a later edition is live again.
      row.retiredAt !== null
    if (drifted) {
      updates.push(
        db.fair.update({
          where: { id: row.id },
          data: {
            name: f.name,
            level: LEVEL_MAP[f.level],
            state: f.state,
            websiteUrl: f.websiteUrl,
            latitude: f.latitude,
            longitude: f.longitude,
            parentFairId,
            retiredAt: null,
          },
        }),
      )
    }
  }
  if (updates.length > 0) await db.$transaction(updates)

  // Retire seeded keys the edition dropped. Not a delete: events, team
  // interests, and notifications reference the row.
  const liveKeys = new Set(FAIRS.map((f) => f.key))
  const retiring = existing.filter((r) => !liveKeys.has(r.seedKey as string) && r.retiredAt === null)
  if (retiring.length > 0) {
    await db.fair.updateMany({
      where: { id: { in: retiring.map((r) => r.id) }, retiredAt: null },
      data: { retiredAt: new Date() },
    })
  }

  // Events. Missing (fairId, year) pairs are created; an existing pair is
  // refreshed ONLY while it is still a pure authored default — a fair that has
  // been crawled owns its dates, and a `confirmed` row is curated truth.
  const allIds = [...idByKey.values()]
  const events = await db.fairEvent.findMany({
    where: { fairId: { in: allIds } },
    select: {
      id: true,
      fairId: true,
      year: true,
      eventDate: true,
      registrationDeadline: true,
      abstractDeadline: true,
      status: true,
    },
  })
  const eventByKey = new Map(events.map((e) => [`${e.fairId}:${e.year}`, e]))
  const crawledFairIds = new Set(existing.filter((r) => r.lastSyncedAt !== null).map((r) => r.id))

  const newEvents: Prisma.FairEventCreateManyInput[] = []
  const eventUpdates: Prisma.PrismaPromise<unknown>[] = []
  for (const f of FAIRS) {
    const fairId = idByKey.get(f.key)
    if (!fairId) continue
    const authored = {
      eventDate: f.eventDate ? new Date(f.eventDate) : null,
      registrationDeadline: f.registrationDeadline ? new Date(f.registrationDeadline) : null,
      abstractDeadline: f.abstractDeadline ? new Date(f.abstractDeadline) : null,
      status: f.status === 'confirmed' ? ('confirmed' as const) : ('estimated' as const),
    }
    const row = eventByKey.get(`${fairId}:${f.year}`)
    if (!row) {
      newEvents.push({ fairId, year: f.year, ...authored })
      continue
    }
    if (row.status === 'confirmed' || crawledFairIds.has(fairId)) continue
    const sameDates =
      sameDate(row.eventDate, authored.eventDate) &&
      sameDate(row.registrationDeadline, authored.registrationDeadline) &&
      sameDate(row.abstractDeadline, authored.abstractDeadline) &&
      row.status === authored.status
    if (sameDates) continue
    eventUpdates.push(
      // Conditional on the row still being an uncorrected default: a crawl that
      // lands between the read above and this write must win, not lose.
      db.fairEvent.updateMany({
        where: { id: row.id, status: 'estimated' },
        data: authored,
      }),
    )
  }
  if (newEvents.length > 0) {
    await db.fairEvent.createMany({ data: newEvents, skipDuplicates: true })
  }
  if (eventUpdates.length > 0) await db.$transaction(eventUpdates)

  logEvent({
    event: 'fairs.reconciled',
    outcome: 'ok',
    detail: `edition=${EDITION_DIGEST} fairsUpdated=${updates.length} retired=${retiring.length} eventsCreated=${newEvents.length} eventsUpdated=${eventUpdates.length}`,
  })
  reconciledDigest = EDITION_DIGEST
}

/** Date equality that tolerates the Date-vs-null asymmetry of optional fields. */
function sameDate(a: Date | null, b: Date | null): boolean {
  if (a === null || b === null) return a === b
  return a.getTime() === b.getTime()
}

export interface FairEventView {
  year: number
  eventDate: string | null
  registrationDeadline: string | null
  abstractDeadline: string | null
  venue: string | null
  status: 'confirmed' | 'estimated'
}

export interface FairView {
  id: string
  name: string
  level: FairLevel
  state: string | null
  websiteUrl: string | null
  distanceMiles: number | null
  event: FairEventView | null
}

export interface FairMatch {
  hasLocation: boolean
  state: string | null
  regional: FairView | null
  stateFair: FairView | null
  isef: FairView | null
  /** Other regional fairs in the state, nearest first (excludes `regional`). */
  otherRegionals: FairView[]
}

const fairInclude = {
  events: { orderBy: { year: 'desc' as const }, take: 1 },
} satisfies Prisma.FairInclude

type FairWithEvents = Prisma.FairGetPayload<{ include: typeof fairInclude }>

function toView(fair: FairWithEvents, teamPoint: readonly [number, number] | null): FairView {
  const e = fair.events[0]
  const distanceMiles =
    teamPoint && fair.latitude != null && fair.longitude != null
      ? Math.round(haversineMiles(teamPoint, [fair.latitude, fair.longitude]))
      : null
  return {
    id: fair.id,
    name: fair.name,
    level: fair.level,
    state: fair.state,
    websiteUrl: fair.websiteUrl,
    distanceMiles,
    event: e
      ? {
          year: e.year,
          eventDate: e.eventDate?.toISOString() ?? null,
          registrationDeadline: e.registrationDeadline?.toISOString() ?? null,
          abstractDeadline: e.abstractDeadline?.toISOString() ?? null,
          venue: e.venue,
          status: e.status === 'confirmed' ? 'confirmed' : 'estimated',
        }
      : null,
  }
}

/**
 * All seeded fairs (with their latest event) loaded ONCE, keyed for in-memory
 * matching. For bulk callers — the notification cron matches thousands of
 * teams against the same few hundred fair rows, so per-team fair queries were
 * a pure N+1 (audit A4). The whole table is a few hundred rows.
 */
export interface FairIndex {
  isef: FairWithEvents | null
  stateByState: Map<string, FairWithEvents>
  regionalsByState: Map<string, FairWithEvents[]>
}

export async function loadFairIndex(): Promise<FairIndex> {
  await ensureFairsSeeded()
  // Retired keys are excluded everywhere a student can be matched (P1-R16).
  const fairs = await db.fair.findMany({ where: { retiredAt: null }, include: fairInclude })
  const index: FairIndex = { isef: null, stateByState: new Map(), regionalsByState: new Map() }
  for (const f of fairs) {
    if (f.level === 'international') {
      index.isef = index.isef ?? f
    } else if (f.level === 'state' && f.state) {
      if (!index.stateByState.has(f.state)) index.stateByState.set(f.state, f)
    } else if (f.level === 'regional' && f.state) {
      const list = index.regionalsByState.get(f.state)
      if (list) list.push(f)
      else index.regionalsByState.set(f.state, [f])
    }
  }
  return index
}

/**
 * Match one team against a preloaded {@link FairIndex} — raw rows (latest
 * event included), no queries. The nearest regional wins, mirroring
 * `matchFairs`.
 */
export function matchFairRowsFromIndex(
  index: FairIndex,
  state: string | null,
  coords?: readonly [number, number] | null,
): { regional: FairWithEvents | null; stateFair: FairWithEvents | null; isef: FairWithEvents | null } {
  if (!state) return { regional: null, stateFair: null, isef: index.isef }
  const teamPoint = resolveTeamPoint(coords, state)
  const regionals = [...(index.regionalsByState.get(state) ?? [])].sort((a, b) => {
    const dist = (f: FairWithEvents) =>
      teamPoint && f.latitude != null && f.longitude != null
        ? haversineMiles(teamPoint, [f.latitude, f.longitude])
        : Number.POSITIVE_INFINITY
    return dist(a) - dist(b)
  })
  return {
    regional: regionals[0] ?? null,
    stateFair: index.stateByState.get(state) ?? null,
    isef: index.isef,
  }
}

/** Match a team's location to its regional fair, state fair, and ISEF. */
export async function matchFairs(
  state: string | null,
  coords?: readonly [number, number] | null,
): Promise<FairMatch> {
  await ensureFairsSeeded()

  const isefRow = await db.fair.findFirst({
    where: { level: 'international', retiredAt: null },
    include: fairInclude,
  })
  const isef = isefRow ? toView(isefRow, null) : null

  if (!state) {
    return { hasLocation: false, state: null, regional: null, stateFair: null, isef, otherRegionals: [] }
  }

  // Prefer geocoded coords (stored on team at onboarding) > state centroid fallback.
  const teamPoint = resolveTeamPoint(coords, state)

  const [stateRow, regionalRows] = await Promise.all([
    db.fair.findFirst({ where: { level: 'state', state, retiredAt: null }, include: fairInclude }),
    db.fair.findMany({ where: { level: 'regional', state, retiredAt: null }, include: fairInclude }),
  ])

  const regionals = regionalRows
    .map((r) => toView(r, teamPoint))
    .sort((a, b) => (a.distanceMiles ?? 1e9) - (b.distanceMiles ?? 1e9))

  return {
    hasLocation: true,
    state,
    regional: regionals[0] ?? null,
    stateFair: stateRow ? toView(stateRow, teamPoint) : null,
    isef,
    otherRegionals: regionals.slice(1),
  }
}