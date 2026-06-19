import { db } from '@/lib/db'
import { FAIRS, type SeedFairLevel } from '@/lib/fairs/dataset'
import { STATE_CENTROIDS, haversineMiles } from '@/lib/fairs/zip'
import type { FairLevel, Prisma } from '@prisma/client'

/**
 * Fair matching (Feature 3b). Lazily mirrors the affiliated-fair dataset
 * (lib/fairs/dataset.ts) into the Fair/FairEvent tables, then matches a team's
 * US location to its state fair, nearest regional fair, and ISEF.
 */

const LEVEL_MAP: Record<SeedFairLevel, FairLevel> = {
  international: 'international',
  state: 'state',
  regional: 'regional',
}

/**
 * Idempotently upsert the seed dataset. Upserts each Fair by its stable
 * `seedKey` and seeds one estimated FairEvent per fair if none exists yet
 * (so AI-synced / manually-corrected events are never clobbered).
 */
export async function ensureFairsSeeded(): Promise<void> {
  const seeded = await db.fair.count({ where: { seedKey: { not: null } } })
  if (seeded >= FAIRS.length) return

  // Ordered isef → state → regional, so a parent always exists before its child.
  const idByKey = new Map<string, string>()
  for (const f of FAIRS) {
    const parentFairId = f.parentKey ? idByKey.get(f.parentKey) ?? null : null
    const fair = await db.fair.upsert({
      where: { seedKey: f.key },
      create: {
        seedKey: f.key,
        name: f.name,
        level: LEVEL_MAP[f.level],
        state: f.state,
        websiteUrl: f.websiteUrl,
        latitude: f.latitude,
        longitude: f.longitude,
        parentFairId,
      },
      update: {
        name: f.name,
        level: LEVEL_MAP[f.level],
        state: f.state,
        websiteUrl: f.websiteUrl,
        latitude: f.latitude,
        longitude: f.longitude,
        parentFairId,
      },
      select: { id: true },
    })
    idByKey.set(f.key, fair.id)

    const existing = await db.fairEvent.findFirst({
      where: { fairId: fair.id, year: f.year },
      select: { id: true },
    })
    if (!existing) {
      await db.fairEvent.create({
        data: {
          fairId: fair.id,
          year: f.year,
          eventDate: f.eventDate ? new Date(f.eventDate) : null,
          registrationDeadline: f.registrationDeadline ? new Date(f.registrationDeadline) : null,
          abstractDeadline: f.abstractDeadline ? new Date(f.abstractDeadline) : null,
          status: f.status === 'confirmed' ? 'confirmed' : 'estimated',
        },
      })
    }
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

/** Match a team's location to its regional fair, state fair, and ISEF. */
export async function matchFairs(state: string | null): Promise<FairMatch> {
  await ensureFairsSeeded()

  const isefRow = await db.fair.findFirst({ where: { level: 'international' }, include: fairInclude })
  const isef = isefRow ? toView(isefRow, null) : null

  if (!state) {
    return { hasLocation: false, state: null, regional: null, stateFair: null, isef, otherRegionals: [] }
  }

  const teamPoint = STATE_CENTROIDS[state] ?? null

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
