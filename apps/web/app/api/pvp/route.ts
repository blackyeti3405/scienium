import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'

export async function POST(req: NextRequest) {
  const { error } = await requireTeamContext(req, { tier: 'mutate', feature: 'pvp' })
  if (error) return error

  // TODO: initiate raid (spec §11) — quota check (pvp_raid_quota) → random
  // matchmaking with refinds → snapshot defender base → create pvp_raids row
  return NextResponse.json({ message: 'not implemented' }, { status: 501 })
}
