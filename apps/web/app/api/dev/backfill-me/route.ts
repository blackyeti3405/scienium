import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { resolveSchool } from '@/lib/onboarding/profile'
import { db } from '@/lib/db'

/**
 * POST /api/dev/backfill-me — development only.
 *
 * Backfills the signed-in dev account's high school to "Santa Clara High School"
 * (find-or-create) for accounts that onboarded before the school field existed.
 * Hard-gated to non-production.
 */
export async function POST(_req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'No user — onboard first' }, { status: 404 })

  const schoolId = await resolveSchool('Santa Clara High School')
  await db.user.update({ where: { id: user.id }, data: { schoolId } })

  return NextResponse.json({ ok: true, school: 'Santa Clara High School', schoolId })
}
