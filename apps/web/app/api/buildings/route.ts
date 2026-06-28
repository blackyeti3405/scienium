import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { loadShopState } from '@/lib/shop-server'
import { loadPlotState } from '@/lib/plot-server'

/**
 * Shop + plot state for the lab scene: owned keys, KP, clearance, the team-size
 * multiplier, plus every placed building (economy + gateway positions).
 *
 * Purchasing is no longer a separate step — a building is bought when it is
 * PLACED on the plot (POST /api/buildings/place), so there is no buy-without-
 * placing endpoint. Move and sell live under /api/buildings/{move,sell}.
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read', feature: 'buildings' })
  if (error) return error

  const [shop, plot] = await Promise.all([loadShopState(ctx.teamId), loadPlotState(ctx.teamId)])
  return NextResponse.json({ ...shop, ...plot })
}
