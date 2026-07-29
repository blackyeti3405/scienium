import 'server-only'
import { createHash, randomBytes, randomUUID } from 'crypto'
import { auth } from '@clerk/nextjs/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { slugify, toShowcaseForView, type ShowcaseForView, type ShowcaseViewer } from '@/lib/showcase'
import { viewFingerprintSalt } from '@/lib/env'

/**
 * Server-only showcase helpers that depend on Node's `crypto`. Kept apart from
 * lib/showcase.ts (which client components import for config/types) so `crypto`
 * never lands in the browser bundle.
 */

/**
 * A slug guaranteed unique by appending a short random suffix.
 *
 * This is a PUBLIC identifier, not a secret — it is title-derived and its random
 * part is six hex characters. It identifies a `public` showcase in the gallery;
 * anonymous `link_only` access goes through `makeShareToken()` instead
 * (REFACTOR2 P1-R7).
 */
export function makeSlug(title: string): string {
  return `${slugify(title)}-${randomUUID().slice(0, 6)}`
}

/**
 * A 128-bit bearer token for `link_only` sharing — the capability the six-hex
 * slug suffix pretended to be. Base64url so it is one URL path segment.
 *
 * Stored in plaintext, deliberately: the team has to be able to read their own
 * link back out of the editor to share it, so a digest-only column would make
 * the feature unusable. Rotation is the revocation mechanism.
 */
export function makeShareToken(): string {
  return randomBytes(16).toString('base64url')
}

// ─── Revision binding (REFACTOR2 P0-R3) ──────────────────────────────────────

/** The fields and assets an approval covers. Change this ⇒ change the digest. */
interface DigestInput {
  shortTitle: string
  title: string
  abstract: string
  privacyLevel: string
  assets: { assetType: string; fileUrl: string | null; metadataJson: unknown }[]
}

/**
 * Digest of everything a reviewer would have seen.
 *
 * `moderationStatus = 'approved'` used to be a mutable flag: after approval a
 * team could rewrite the title/abstract or replace the board, quad chart, video,
 * repository, and supplement assets and stay approved. Approval is now bound to
 * this value, so any covered change is detectable.
 *
 * Assets are sorted by `(type, url, metadata)` so the digest depends on content,
 * not on row ids or insertion order — replacing a board with an identical file
 * is genuinely the same revision and should not re-trigger review.
 */
export function showcaseContentDigest(sc: DigestInput): string {
  // JSON, not concatenation: a separator a title could itself contain would let
  // two different revisions hash alike, which is the one failure this must not
  // have. (`check:integrity` also forbids a control byte as that separator.)
  const assets = sc.assets
    .map((a) => JSON.stringify([a.assetType, a.fileUrl ?? '', a.metadataJson ?? null]))
    .sort()
  return createHash('sha256')
    .update(JSON.stringify([sc.shortTitle, sc.title, sc.abstract, sc.privacyLevel, assets]))
    .digest('hex')
}

/** Privacy levels whose content is reachable outside the author team AND reviewed. */
export function requiresReview(privacyLevel: string): boolean {
  // `public` (listed in the gallery, indexable) is the reviewed mode.
  //
  // `link_only` is an EXPLICIT ACCEPTANCE, per REFACTOR2 P0-R3's "require review
  // for every externally reachable mode, or explicitly accept each narrower
  // mode": it is unlisted, exists so a team can share a work-in-progress with a
  // parent or mentor, and gating it behind a teacher queue would make the
  // ordinary sharing path unusable. That acceptance now rests on a real secret —
  // P1-R7 replaced the guessable slug with a 128-bit rotatable share token, so
  // "unlisted" is true rather than aspirational.
  return privacyLevel === 'public'
}

/** Minimal Prisma surface `syncShowcaseRevision` needs — the client or a tx. */
type RevisionDb = Pick<typeof db, 'showcase' | 'showcaseModerationEvent'>

/**
 * Recompute the digest after a write and, if the content moved away from what a
 * teacher approved, atomically return the showcase to review.
 *
 * EVERY path that can change a covered field or asset must call this — the
 * showcase PUT, the file-upload route, the link route, and asset deletion.
 * That is why it lives here rather than in any one route.
 *
 * Returns the current digest and whether an approval was invalidated.
 */
export async function syncShowcaseRevision(
  tx: RevisionDb,
  showcaseId: string,
  actorUserId?: string | null,
): Promise<{ digest: string; invalidated: boolean }> {
  const sc = await tx.showcase.findUnique({
    where: { id: showcaseId },
    select: {
      shortTitle: true,
      title: true,
      abstract: true,
      privacyLevel: true,
      moderationStatus: true,
      approvedDigest: true,
      contentDigest: true,
      assets: { select: { assetType: true, fileUrl: true, metadataJson: true } },
    },
  })
  if (!sc) return { digest: '', invalidated: false }

  const digest = showcaseContentDigest(sc)
  if (digest === sc.contentDigest) return { digest, invalidated: false }

  // Approval covers a revision, not a showcase. Once the served content differs
  // from the approved one, the showcase is no longer approved-as-served.
  const invalidated =
    sc.moderationStatus === 'approved' &&
    requiresReview(sc.privacyLevel) &&
    sc.approvedDigest !== digest

  await tx.showcase.update({
    where: { id: showcaseId },
    data: {
      contentDigest: digest,
      ...(invalidated
        ? { moderationStatus: 'pending_review' as const, moderatedAt: null, approvedDigest: null }
        : {}),
    },
  })

  if (invalidated) {
    await tx.showcaseModerationEvent.create({
      data: { showcaseId, digest, action: 'revision_invalidated', actorUserId: actorUserId ?? null },
    })
  }

  return { digest, invalidated }
}

/**
 * `toShowcaseForView`, with the approval RE-VERIFIED against the content this
 * read is about to serve — the backstop under `syncShowcaseRevision`.
 *
 * Sync is the primary guard, but it is a call every write path has to remember;
 * this is what happens when one forgets. The digest is recomputed from the rows
 * just loaded, and if it no longer matches what a teacher approved, the showcase
 * reads as `pending_review`: the public page and the print one-pager 404, while
 * the owning team and the reviewing teacher still see their own draft (they
 * never depended on `approved` in the first place).
 *
 * Deliberately read-only — a public page must not write. The stale row is left
 * for the next write's `syncShowcaseRevision` to correct.
 */
export function toVerifiedShowcaseForView(
  sc: DigestInput & {
    teamId: string
    publishedAt: Date | null
    moderationStatus: string
    approvedDigest: string | null
    team: { members: { user: { schoolId: string | null } }[] }
  },
): ShowcaseForView {
  const forView = toShowcaseForView(sc)
  if (
    forView.moderationStatus === 'approved' &&
    requiresReview(sc.privacyLevel) &&
    sc.approvedDigest !== showcaseContentDigest(sc)
  ) {
    return { ...forView, moderationStatus: 'pending_review' }
  }
  return forView
}

/**
 * Resolves the signed-in viewer's team/school context for a privacy check (null
 * when anonymous). For a teacher this also resolves the teams they teach, so
 * `canViewShowcase` can grant the moderator preview (P0-R3) — the extra query
 * runs only for `role: 'teacher'`, never on the anonymous public-page path.
 */
export async function resolveShowcaseViewer(): Promise<ShowcaseViewer | null> {
  const { userId } = await auth()
  if (!userId) return null
  const u = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, role: true, schoolId: true, teamMemberships: { select: { teamId: true } } },
  })
  if (!u) return { userId, schoolId: null, teamIds: [], moderatorTeamIds: [] }

  let moderatorTeamIds: string[] = []
  if (u.role === 'teacher' || u.role === 'admin') {
    // Teams with at least one member in a class this teacher owns — the same
    // ownership rule `teacherOwnsTeam` applies, expressed as one query.
    const teams = await db.team.findMany({
      where: { members: { some: { user: { class: { teacherId: u.id } } } } },
      select: { id: true },
    })
    moderatorTeamIds = teams.map((t) => t.id)
  }

  return {
    userId,
    schoolId: u.schoolId,
    teamIds: u.teamMemberships.map((m) => m.teamId),
    moderatorTeamIds,
  }
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