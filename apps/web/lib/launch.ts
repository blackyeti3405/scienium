/**
 * Launch resolution for the marketing home (`/`). A signed-in player's "Launch"
 * button used to point at `/game`, a redirect-only "door" that ran auth +
 * teacher-role resolution and then bounced them to `/teacher` or `/lab` — a full
 * extra server round-trip on the click. This resolves the SAME destination up front
 * so the buttons can link straight there and skip the hop, and returns the sprites
 * worth pre-warming so the lab paints instantly.
 *
 * Routing reuses the canonical `resolveTeacherRole` (DB role is authoritative; the
 * Clerk claim only bootstraps a row-less account), so it stays identical to `/game`.
 */

import { getTeamContext } from '@/lib/team/context'
import { resolveTeacherRole } from '@/lib/teacher/auth'
import {
  GATEWAY_KEYS,
  GROUND_TILE_IDS,
  GROUND_TILES,
  getGatewaySprite,
  type GatewaySkin,
} from '@/lib/sprites/manifest'

export interface LaunchContext {
  /** Where this signed-in user's "Launch" buttons should point. */
  href: string
  /** Sprite URLs worth pre-warming before launch (empty for teachers / no team). */
  preloadSprites: string[]
}

// Ground tiles are skin-independent and tile the ENTIRE viewport, so they are the
// single biggest thing the lab paints — always worth warming.
const TILE_SPRITES = GROUND_TILE_IDS.map((id) => GROUND_TILES[id].path)

/** The 7 gateway building sprites for a given lab-type skin. */
function gatewaySprites(skin: GatewaySkin): string[] {
  return GATEWAY_KEYS.map((k) => getGatewaySprite(k, skin).path)
}

/**
 * Resolve where a signed-in player's "Launch" button should send them and which
 * sprites to pre-warm so the lab paints instantly.
 */
export async function getLaunchContext(
  userId: string,
  sessionClaims: unknown,
): Promise<LaunchContext> {
  // Teachers go to their dashboard (they have no team). Mirrors /game exactly.
  try {
    if (await resolveTeacherRole(userId, sessionClaims)) {
      return { href: '/teacher', preloadSprites: [] }
    }
  } catch {
    // DB unavailable (build/preview): fall back to the neutral door, which routes
    // server-side once it can reach the DB.
    return { href: '/game', preloadSprites: [] }
  }

  // Non-teacher → the lab. Warm the ground tiles plus this player's skin gateways.
  let labType: GatewaySkin | null = null
  try {
    labType = ((await getTeamContext(userId))?.labType as GatewaySkin | null) ?? null
  } catch {
    // Non-fatal: a missing skin just warms the generic gateways.
  }
  const skin = labType ?? 'generic'
  return { href: '/lab', preloadSprites: [...TILE_SPRITES, ...gatewaySprites(skin)] }
}
