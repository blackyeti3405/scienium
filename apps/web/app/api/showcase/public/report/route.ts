import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { parseJson } from '@/lib/validation'
import { clientIp, enforceRateLimit } from '@/lib/rate-limit'
import { recordSecurityEvent } from '@/lib/observability/security-event'
import {
  canViewShowcase,
  SHOWCASE_REPORT_REASONS,
  type ShowcaseAccess,
} from '@/lib/showcase'
import { reporterHash, toVerifiedShowcaseForView } from '@/lib/showcase-server'

/**
 * POST /api/showcase/public/report — report a published showcase (REFACTOR2 P1-6).
 *
 * Deliberately ANONYMOUS. The audience for a public showcase is parents, other
 * schools, and judges, none of whom have an account here; a report path that
 * required one would only ever be used by the students themselves. It sits under
 * `/api/showcase/public/` so it is covered by the middleware allowlist the asset
 * route already uses.
 *
 * What stands in for authentication:
 *
 *  - **the same view gate as the page.** Only a showcase an anonymous visitor
 *    could actually OPEN can be reported (`canViewShowcase` with a null viewer),
 *    so this is not an oracle for the existence of private drafts, and a
 *    taken-down page cannot be reported again;
 *  - **rate limiting keyed on the reporter's own hash**, so the tight per-identity
 *    bucket applies to an anonymous caller instead of the deliberately loose
 *    per-IP backstop (which exists to fit a whole classroom behind one NAT);
 *  - **a unique key** over (showcase, reporter, reason), so a reload, a
 *    rage-click, or a retry adds nothing — the count a teacher sees counts
 *    people, not clicks;
 *  - **a per-showcase ceiling**, so a distributed brigade cannot use one page to
 *    fill the table.
 *
 * There is no free-text field, by design (see `SHOWCASE_REPORT_REASONS`).
 */

const ReportBody = z
  .object({
    /** The public slug or the share token — whatever is in the visitor's URL. */
    showcase: z.string().trim().min(1).max(120),
    reason: z.enum(SHOWCASE_REPORT_REASONS),
  })
  .strict()

/**
 * Reports accepted for ONE showcase per hour before further ones are dropped.
 *
 * Sized to be unreachable by a real classroom (a report is a rare act) and
 * cheap to hit with a botnet, which is exactly the split it is for: past this,
 * the teacher already has every signal a report can give them, and the only
 * thing more rows add is table growth.
 */
const PER_SHOWCASE_HOURLY_CAP = 100

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const reporter = reporterHash(ip)

  // The per-identity bucket, keyed on the hash rather than a user id: for an
  // anonymous caller THAT is the identity. Passing it as the "user" is what
  // gets the tight `report` tier instead of the classroom-sized IP backstop.
  const limited = await enforceRateLimit(req, 'report', reporter)
  if (limited) return limited

  const { data, error } = await parseJson(req, ReportBody)
  if (error) return error

  const sc = await db.showcase.findFirst({
    where: { OR: [{ slug: data.showcase }, { shareToken: data.showcase }] },
    select: {
      id: true,
      teamId: true,
      slug: true,
      shareToken: true,
      privacyLevel: true,
      publishedAt: true,
      moderationStatus: true,
      takedownAt: true,
      contentDigest: true,
      // Digest inputs, so the reported revision is the one actually served.
      shortTitle: true,
      title: true,
      abstract: true,
      approvedDigest: true,
      assets: { select: { assetType: true, fileUrl: true, metadataJson: true } },
      team: { select: { members: { select: { user: { select: { schoolId: true } } } } } },
    },
  })

  // Same gate, same arguments as the page — with a NULL viewer, because what is
  // reportable is what the public can see, not what this caller can see.
  const via: ShowcaseAccess = sc && sc.shareToken === data.showcase ? 'share_token' : 'slug'
  if (!sc || !canViewShowcase(toVerifiedShowcaseForView(sc), null, via)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const recent = await db.showcaseReport.count({
    where: { showcaseId: sc.id, createdAt: { gte: new Date(Date.now() - 60 * 60_000) } },
  })
  // Answer OK either way: whether a report landed is not something a caller
  // gets to probe, and a reporter who is told "we already have plenty" learns
  // something about the page they should not.
  if (recent >= PER_SHOWCASE_HOURLY_CAP) return NextResponse.json({ ok: true })

  try {
    await db.showcaseReport.create({
      data: {
        showcaseId: sc.id,
        digest: sc.contentDigest,
        reason: data.reason,
        reporterHash: reporter,
      },
      select: { id: true },
    })
  } catch (err) {
    // P2002 is the DESIGNED outcome of a repeat report — the unique key did its
    // job. Nothing new happened, so nothing new is recorded.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ ok: true, duplicate: true })
    }
    throw err
  }

  // Ledger row, so "when did reports start arriving on this page" survives the
  // page. `actorType: 'anonymous'` and no actor id: the reporter hash is dedupe
  // material for one table, not an identity to propagate.
  await recordSecurityEvent({
    kind: 'moderation.report',
    // Non-`ok`, which is what makes the threshold rule count it (see ALERT_RULES).
    outcome: 'denied',
    actorType: 'anonymous',
    targetType: 'showcase',
    targetId: sc.id,
    scopeId: sc.teamId,
    reason: data.reason,
  })

  return NextResponse.json({ ok: true })
}
