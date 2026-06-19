'use client'

import { useState } from 'react'
import { TileBackground } from '@/components/lab/TileBackground'
import { BuildingSprite } from '@/components/lab/BuildingSprite'
import { FeaturePanel } from '@/components/lab/FeaturePanel'
import { ShopPanel } from '@/components/lab/ShopPanel'
import { TeamPanel } from '@/components/lab/TeamPanel'
import { PhaseAdvance } from '@/components/lab/PhaseAdvance'
import { StatusStrip, type Currency } from '@/components/lab/StatusStrip'
import { LabCurrencyProvider } from '@/lib/labCurrency'
import { FEATURE_COMPONENTS } from '@/lib/featureRegistry'
import { GATEWAYS, type Gateway } from '@/lib/gateways'
import { type GatewaySkin } from '@/lib/sprites/manifest'
import type { AdvanceProgress } from '@/lib/team/advance'
import {
  isPhaseAtLeast,
  isFeatureUnlocked,
  PHASE_INFO,
  FEATURE_MIN_PHASE,
  type Phase,
  type LabType,
} from '@/lib/phase'

// Isometric spacing between adjacent plot cells, in screen px.
const STEP_X = 58
const STEP_Y = 40
// Nudge the cluster up slightly so the tall front buildings stay optically centred.
const CLUSTER_Y = -12

export interface LabSceneProps {
  teamName: string
  phase: Phase
  labType: LabType | null
  currency: Currency
  /** Whether any team member holds the Presenter figurine (gates the Showcase). */
  hasPresenter: boolean
  /** Live team size — building costs scale by it (Feature 1c). */
  memberCount: number
  /** Literature-phase advance gate, or null when no gate applies (Feature 1e). */
  advance: AdvanceProgress | null
  /** Stable per-team seed so the tiled background never reshuffles. */
  seed?: number
}

export function LabScene({
  teamName,
  phase,
  labType,
  currency,
  hasPresenter,
  memberCount,
  advance,
  seed = 1,
}: LabSceneProps) {
  const [openKey, setOpenKey] = useState<Gateway['key'] | null>(null)
  const [shopOpen, setShopOpen] = useState(false)
  const [teamOpen, setTeamOpen] = useState(false)

  const skin: GatewaySkin = (labType ?? 'generic') as GatewaySkin

  // TODO: restore phase gating once progression is wired up.
  // For now show all buildings so each feature can be built and tested independently.
  const present = GATEWAYS

  const openGateway = openKey ? (GATEWAYS.find((g) => g.key === openKey) ?? null) : null
  const FeatureComponent = openKey ? FEATURE_COMPONENTS[openKey] : null

  function lockInfo(g: Gateway): { locked: boolean; reason?: string } {
    // Presence already implies the feature's phase is met; mirror the same gate
    // the server enforces, plus the Presenter-figurine requirement for Showcase.
    if (!isFeatureUnlocked(phase, g.feature)) {
      return {
        locked: true,
        reason: `Unlocks at ${PHASE_INFO[FEATURE_MIN_PHASE[g.feature]].label}`,
      }
    }
    if (g.requiresFigurine === 'presenter' && !hasPresenter) {
      return { locked: true, reason: 'Requires the Presenter figurine' }
    }
    return { locked: false }
  }

  return (
    <LabCurrencyProvider initial={currency}>
      {(liveCurrency) => (
        <div className="lab-scene">
          <StatusStrip
            teamName={teamName}
            phase={phase}
            labType={labType}
            currency={liveCurrency}
            onOpenTeam={() => setTeamOpen(true)}
          />

          {advance && <PhaseAdvance progress={advance} />}

          <div className="lab-scene__viewport">
            <TileBackground seed={seed} />

            <div className="lab-scene__cluster">
              {present.map((g) => {
                const dx = (g.cell.gx - g.cell.gy) * STEP_X
                const dy = (g.cell.gx + g.cell.gy) * STEP_Y + CLUSTER_Y
                const depth = g.cell.gx + g.cell.gy // higher = nearer the viewer
                // TODO: restore lock gating once progression is wired up.
                const { locked, reason } = { locked: false, reason: undefined }
                return (
                  <BuildingSprite
                    key={g.key}
                    gateway={g}
                    skin={skin}
                    dx={dx}
                    dy={dy}
                    zIndex={20 + depth * 2}
                    scale={2}
                    locked={locked}
                    lockedReason={reason}
                    onOpen={(gw) => setOpenKey(gw.key)}
                  />
                )
              })}
            </div>

            {present.length <= 2 && (
              <p className="lab-scene__hint font-pixel">
                Commit to a topic &amp; pick a lab type to grow your lab
              </p>
            )}

            {/* Buildings shop — anchored bottom-right of the lab viewport. */}
            <button
              type="button"
              className="shop-button font-pixel"
              onClick={() => setShopOpen(true)}
              title="Buildings"
              aria-label="Open buildings shop"
            >
              <span className="shop-button__icon" aria-hidden="true">
                ⚒
              </span>
              <span className="shop-button__label">SHOP</span>
            </button>
          </div>

          {openGateway && FeatureComponent && (
            <FeaturePanel title={openGateway.label} onClose={() => setOpenKey(null)}>
              <FeatureComponent />
            </FeaturePanel>
          )}

          {shopOpen && (
            <ShopPanel
              currency={liveCurrency}
              memberCount={memberCount}
              onClose={() => setShopOpen(false)}
            />
          )}

          {teamOpen && <TeamPanel onClose={() => setTeamOpen(false)} />}
        </div>
      )}
    </LabCurrencyProvider>
  )
}
