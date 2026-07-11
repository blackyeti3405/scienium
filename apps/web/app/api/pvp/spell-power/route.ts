import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { getSpellPower } from '@/lib/pvp/spell-power'

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const { tasksCompleted, tier, multiplier } = await getSpellPower(ctx.teamId)

  return NextResponse.json({
    tasksCompleted,
    tier,
    multiplier,
    // Convenience aliases so the client doesn't need to derive these
    label: tier === 'NONE' ? 'Dormant' : tier === 'BASE' ? 'Active' : tier === 'BOOSTED' ? 'Charged' : 'Overcharged',
  })
}
