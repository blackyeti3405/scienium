import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/teacher/auth'
import { classJoinCodeExpiry, generateInviteCode } from '@/lib/team/invite'
import { recordSecurityEvent } from '@/lib/observability/security-event'
import { db } from '@/lib/db'

/**
 * POST /api/teacher/class/[id]/code — regenerate a class's reusable join code.
 * This is the revocation mechanism: a leaked or over-shared code is instantly
 * invalidated (old code stops resolving) and a fresh one is minted. Strictly
 * scoped to a class this teacher owns. Existing enrolled students are unaffected
 * (enrollment isn't the code); only NEW join attempts with the old code fail.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error } = await requireTeacher(req, { tier: 'mutate' })
  if (error) return error

  // Ownership check via scoped query — 404 (not 403) so we never confirm a class
  // id the teacher doesn't own even exists.
  const owned = await db.class.findFirst({
    where: { id: params.id, teacherId: ctx.dbUserId },
    select: { id: true },
  })
  if (!owned) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  // Mint a fresh unique code, retrying on the rare collision (mirrors create).
  // Every mint also renews the expiry window (SEC2-003) — regeneration is both
  // the revoke AND the renew path.
  const joinCodeExpiresAt = classJoinCodeExpiry()
  let joinCode: string | null = null
  for (let attempt = 0; attempt < 5 && !joinCode; attempt++) {
    const candidate = generateInviteCode(6)
    try {
      await db.class.update({
        where: { id: owned.id },
        data: { joinCode: candidate, joinCodeExpiresAt },
      })
      joinCode = candidate
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002') {
        continue // code collision — try another
      }
      throw err
    }
  }
  if (!joinCode) {
    return NextResponse.json({ error: 'Could not generate a unique class code, try again.' }, { status: 503 })
  }

  // This route IS the revocation lever for a leaked class code, so "when was it
  // last rotated, and by whom" is a question an incident will ask (REFACTOR2
  // P1-5). The code itself is never recorded — it is a live credential.
  await recordSecurityEvent({
    kind: 'authority.join_code',
    outcome: 'ok',
    actorType: 'teacher',
    actorUserId: ctx.dbUserId,
    targetType: 'class',
    targetId: owned.id,
    scopeId: owned.id,
    reason: 'class_code_rotated',
  })

  return NextResponse.json({ joinCode, joinCodeExpiresAt })
}
