import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, teamName } = await req.json()
  if (!name?.trim() || !teamName?.trim()) {
    return NextResponse.json({ error: 'Name and team name are required' }, { status: 400 })
  }

  const email =
    clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress

  if (!email) return NextResponse.json({ error: 'No email on Clerk account' }, { status: 400 })

  // Idempotent — if user already exists just return their team
  const existing = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: { teamMemberships: { include: { team: true }, take: 1 } },
  })

  if (existing?.teamMemberships[0]) {
    return NextResponse.json({ teamId: existing.teamMemberships[0].team.id })
  }

  const user =
    existing ??
    (await db.user.create({
      data: { clerkUserId: userId, name: name.trim(), email },
    }))

  const team = await db.team.create({
    data: {
      name: teamName.trim(),
      teamLeadId: user.id,
      phase: 'literature_review',
      members: { create: { userId: user.id, role: 'lead' } },
      // Every team starts with a zeroed currency ledger so KP/CLR/LC awards
      // (e.g. literature-review quiz proficiency) always have a row to update.
      currency: { create: {} },
    },
  })

  return NextResponse.json({ teamId: team.id })
}
