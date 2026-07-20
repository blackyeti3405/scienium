import 'server-only'
import { createHash, randomUUID } from 'crypto'
import { auth } from '@clerk/nextjs/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { slugify, type ShowcaseViewer } from '@/lib/showcase'
import { viewFingerprintSalt } from '@/lib/env'

/**
 * Server-only showcase helpers that depend on Node's `crypto`. Kept apart from
 * lib/showcase.ts (which client components import for config/types) so `crypto`
 * never lands in the browser bundle.
 */

/** A slug guaranteed unique by appending a short random suffix. */
export function makeSlug(title: string): string {
  return `${slugify(title)}-${randomUUID().slice(0, 6)}`
}

/** Resolves the signed-in viewer's team/school context for a privacy check (null when anonymous). */
export async function resolveShowcaseViewer(): Promise<ShowcaseViewer | null> {
  const { userId } = await auth()
  if (!userId) return null
  const u = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { schoolId: true, teamMemberships: { select: { teamId: true } } },
  })
  if (!u) return { userId, schoolId: null, teamIds: [] }
  return { userId, schoolId: u.schoolId, teamIds: u.teamMemberships.map((m) => m.teamId) }
}

/**
 * A per-day, per-visitor fingerprint that never stores a raw IP. Salted hash of
 * (ip + user-agent + UTC date) so repeated views in a day collapse to one row but
 * the underlying identity isn't recoverable. The salt (`VIEW_FINGERPRINT_SALT`,
 * required ≥16 chars in production, dev-fallback otherwise) is resolved lazily by
 * `viewFingerprintSalt()` in `lib/env.ts` — so it only gates this call, not
 * `makeSlug` or `next build`.
 */
export function viewFingerprint(ip: string, userAgent: string): string {
  const day = new Date().toISOString().slice(0, 10)
  return createHash('sha256').update(`${viewFingerprintSalt()}|${ip}|${userAgent}|${day}`).digest('hex').slice(0, 32)
}

/**
 * Count one showcase view per visitor per UTC day (A13). Duplicate-safe by
 * construction: the `(showcaseId, visitorFingerprint, day)` unique key decides
 * — there is no read-then-write window, so two concurrent first loads can
 * never double-count. Only the duplicate itself is swallowed; any other DB
 * failure propagates to the caller (which treats view tracking as
 * best-effort).
 */
export async function recordShowcaseView(
  showcaseId: string,
  visitorFingerprint: string,
  now: Date = new Date(),
): Promise<'counted' | 'already_counted'> {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  try {
    await db.showcaseView.create({ data: { showcaseId, visitorFingerprint, day } })
    return 'counted'
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return 'already_counted'
    }
    throw err
  }
}