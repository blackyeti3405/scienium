import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/teacher/auth'
import { loadStudentOverview } from '@/lib/teacher/student-overview'

/**
 * GET /api/teacher/student/[id]/overview — comprehensive student drill-down.
 *
 * Thin adapter (Track B P1-2): resolve the teacher principal, call the ONE
 * application operation, map the typed result to HTTP. The workflow — the
 * class-scope IDOR guard, membership-based team resolution, the parallel
 * section fan-out, and the enrichment — lives in
 * `lib/teacher/student-overview.ts`.
 *
 * Read-only — no POST/PUT/DELETE handler.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { ctx, error } = await requireTeacher(req, { tier: 'read' })
  if (error) return error

  const result = await loadStudentOverview(params.id, { classIds: ctx.classIds })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result.overview)
}
