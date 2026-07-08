import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTeamContext } from '@/lib/phase'
import { db } from '@/lib/db'
import { createHash } from 'crypto'

// Hard-gated: this route is completely inert in production.
if (process.env.NODE_ENV === 'production') {
  // This module should never be reached in prod, but belt-and-suspenders.
}

const FAKE_TITLES = [
  'Advances in Biomechanical Modeling of Prosthetic Limbs',
  'Electromyographic Control Strategies for Upper-Limb Prostheses',
  'Energy Return Dynamics in Carbon-Fiber Prosthetic Feet',
  'Machine Learning Approaches to Gait Analysis and Prediction',
  'Material Properties of Silicone-Based Prosthetic Liners',
  'Neural Interface Technologies for Somatosensory Feedback',
  'Osseointegration Outcomes in Transfemoral Amputees',
  'Passive vs. Active Ankle-Foot Orthoses: A Comparative Study',
  'Patient Satisfaction Metrics in Prosthetic Rehabilitation',
  'Residual Limb Volume Changes and Socket Fit in Lower-Limb Amputees',
  'Robotic Knee Joints with Variable Impedance Control',
  'Sensory Substitution for Proprioceptive Feedback in Amputees',
  'Socket Design Optimization Using Finite Element Analysis',
  'Stiffness Tuning in Compliant Prosthetic Ankle Mechanisms',
  'Targeted Muscle Reinnervation for Intuitive Prosthetic Control',
  'Transtibial Prosthesis Alignment and Its Effects on Gait',
  'User-Centered Design Methods in Prosthetics Development',
  'Variable Cadence Walking with Powered Prosthetic Legs',
  'Wearable Sensors for Real-Time Prosthesis Performance Monitoring',
  'Biomechanics of Running with Passive and Active Prosthetic Feet',
  'Deep Learning for Terrain Classification in Lower-Limb Prosthetics',
  'Exoskeleton-Assisted Rehabilitation After Lower-Limb Amputation',
  'Force-Torque Sensing in Prosthetic Wrist Joints',
  'Ground Reaction Forces During Stair Ascent with Prosthetic Limbs',
  'Hip Disarticulation Prosthetic Fitting: Challenges and Solutions',
]

/**
 * POST /api/dev/fill-papers
 *
 * Development-only: fills the authenticated team's literature review with
 * 25 fake ready papers and marks every team member proficient on all of them.
 * Already-existing papers are counted toward the 25 and skipped.
 *
 * Deliberately NOT migrated to requireTeamContext: that helper enforces a
 * rate limit, and this dev/E2E seeding route must stay unlimited.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const dbUser = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const [existingPapers, members] = await Promise.all([
    db.paper.findMany({ where: { teamId: ctx.teamId, status: 'ready' }, select: { id: true } }),
    db.teamMember.findMany({ where: { teamId: ctx.teamId }, select: { userId: true } }),
  ])

  const existingCount = existingPapers.length
  const needed = Math.max(0, 25 - existingCount)

  let created = 0
  const allPaperIds: string[] = existingPapers.map((p) => p.id)

  // Create however many new papers are needed to reach 25
  const titlesToCreate = FAKE_TITLES.slice(existingCount, existingCount + needed)
  for (const title of titlesToCreate) {
    const hash = createHash('sha256').update(`dev-${ctx.teamId}-${title}`).digest('hex')
    const paper = await db.paper.create({
      data: {
        teamId: ctx.teamId,
        title,
        authors: ['Dev, Author'],
        abstract: `Auto-generated dev paper: ${title}`,
        sourceType: 'pdf',
        status: 'ready',
        fullText: `This is a placeholder paper for development purposes. Title: ${title}`,
        contentHash: hash,
        uploadedByUserId: dbUser.id,
      },
    })
    allPaperIds.push(paper.id)
    created++
  }

  // Ensure every team member has proficiency on ALL 25 papers (including pre-existing ones)
  for (const paperId of allPaperIds) {
    await db.paperProficiency.createMany({
      data: members.map((m) => ({
        paperId,
        userId: m.userId,
        demonstrated: true,
        bestScore: 85,
        kpAwarded: 85,
      })),
      skipDuplicates: true,
    })
  }

  return NextResponse.json({ created, total: allPaperIds.length })
}
