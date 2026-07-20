import 'server-only'
import { db } from '@/lib/db'
import { FAIRS, type SeedFairLevel } from '@/content/fairs/dataset'
import { STATE_CENTROIDS, zipToApproxCoords, haversineMiles } from '@/lib/fairs/zip'
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
 * top-up is a handful of round trips instead of the old per-fair upsert loop
 * (~800 sequential queries against the remote DB; it hung /api/fairs/match for
 * 2+ minutes whenever `seeded < FAIRS.length`).
 *
 * Shape:
 *  - Fast path: one count query; fully seeded → return. Self-heals after a
 *    dataset regen (count drops below the new length → one fast top-up).
 *  - Missing fairs are inserted per level (international → state → regional) so
 *    a parent's id exists before its children reference it. `createMany` with
 *    `skipDuplicates` is race-safe across processes via the `seedKey` unique.
 *  - Existing fairs get targeted updates only when their dataset fields
 *    actually drifted (normally zero; nonzero only after a fall regen).
 *  - Events are created only where the (fairId, year) pair is missing — never
 *    updated, because /api/fairs/[id]/sync-deadlines writes scraped corrections
 *    into these rows and the static dataset must not clobber them. The
 *    (fairId, year) unique index (20260704051500) makes the createMany
 *    stampede-safe; the same migration deduped historical duplicate rows.
 *  - In-process callers share one seeding run via a module-level single-flight
 *    promise, so a request stampede can't run the loop twice in parallel.
 */
let seedInFlight: Promise<void> | null = null

export function ensureFairsSeeded(): Promise<void> {
  if (!seedInFlight) {
    seedInFlight = seedFairsBatched().finally(() => {
      seedInFlight = null
    })
  }
  return seedInFlight
}

const SEED_LEVELS = ['international', 'state', 'regional'] as const

async function seedFairsBatched(): Promise<void> {
  const seeded = await db.fair.count({ where: { seedKey: { not: null } } })
  if (seeded >= FAIRS.length) return

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

  // Targeted updates for rows whose dataset fields drifted (rare: fall regen).
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
      row.parentFairId !== parentFairId
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
          },
        }),
      )
    }
  }
  if (updates.length > 0) await db.$transaction(updates)

  // Create only the missing (fairId, year) events; never update existing rows
  // (sync-deadlines corrections live there).
  const allIds = [...idByKey.values()]
  const events = await db.fairEvent.findMany({
    where: { fairId: { in: allIds } },
    select: { fairId: true, year: true },
  })
  const haveEvent = new Set(events.map((e) => `${e.fairId}:${e.year}`))
  const newEvents = FAIRS.flatMap((f) => {
    const fairId = idByKey.get(f.key)
    if (!fairId || haveEvent.has(`${fairId}:${f.year}`)) return []
    return [
      {
        fairId,
        year: f.year,
        eventDate: f.eventDate ? new Date(f.eventDate) : null,
        registrationDeadline: f.registrationDeadline ? new Date(f.registrationDeadline) : null,
        abstractDeadline: f.abstractDeadline ? new Date(f.abstractDeadline) : null,
        status: f.status === 'confirmed' ? ('confirmed' as const) : ('estimated' as const),
      },
    ]
  })
  if (newEvents.length > 0) {
    await db.fairEvent.createMany({ data: newEvents, skipDuplicates: true })
  }
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
  const fairs = await db.fair.findMany({ include: fairInclude })
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
  const teamPoint = coords ?? STATE_CENTROIDS[state] ?? null
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

  const isefRow = await db.fair.findFirst({ where: { level: 'international' }, include: fairInclude })
  const isef = isefRow ? toView(isefRow, null) : null

  if (!state) {
    return { hasLocation: false, state: null, regional: null, stateFair: null, isef, otherRegionals: [] }
  }

  // Prefer geocoded coords (stored on team at onboarding) > state centroid fallback.
  const teamPoint = coords ?? STATE_CENTROIDS[state] ?? null

  const [stateRow, regionalRows] = await Promise.all([
    db.fair.findFirst({ where: { level: 'state', state }, include: fairInclude }),
    db.fair.findMany({ where: { level: 'regional', state }, include: fairInclude }),
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