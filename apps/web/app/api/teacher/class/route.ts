import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacher } from '@/lib/teacher/auth'
import { parseJson } from '@/lib/validation'
import { resolveSchool } from '@/lib/onboarding/profile'
import { generateInviteCode } from '@/lib/team/invite'
import { db } from '@/lib/db'

/** GET /api/teacher/class — the teacher's classrooms + their reusable join codes. */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeacher(req, { tier: 'read' })
  if (error) return error

  const classes = await db.class.findMany({
    where: { teacherId: ctx.dbUserId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      joinCode: true,
      createdAt: true,
      school: { select: { name: true } },
      _count: { select: { users: true } },
    },
  })

  return NextResponse.json({ classes })
}

const CreateClassBody = z
  .object({
    name: z.string().trim().min(1, 'Class name is required').max(80),
    schoolName: z.string().trim().max(120).optional(),
  })
  .strict()

/**
 * POST /api/teacher/class — create a classroom with a freshly-minted, reusable
 * join code. The school is the teacher's own (if set) or found-or-created from
 * the provided name.
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeacher(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, CreateClassBody)
  if (bodyError) return bodyError

  // Prefer the teacher's existing school; otherwise create from the supplied name.
  const teacher = await db.user.findUnique({ where: { id: ctx.dbUserId }, select: { schoolId: true } })
  const schoolId = teacher?.schoolId ?? (await resolveSchool(data.schoolName))
  if (!schoolId) {
    return NextResponse.json({ error: 'A school name is required to create a class.' }, { status: 400 })
  }

  // Mint a unique join code, retrying on the rare collision.
  let created: { id: string; name: string; joinCode: string | null } | null = null
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    try {
      created = await db.class.create({
        data: { name: data.name, schoolId, teacherId: ctx.dbUserId, joinCode: generateInviteCode(6) },
        select: { id: true, name: true, joinCode: true },
      })
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002') {
        continue // join-code collision — try a new code
      }
      throw err
    }
  }
  if (!created) {
    return NextResponse.json({ error: 'Could not generate a unique class code, try again.' }, { status: 503 })
  }

  return NextResponse.json({ class: created })
}
