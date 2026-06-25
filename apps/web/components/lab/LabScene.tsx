'use client'

import { useEffect, useState } from 'react'
import { TileBackground } from '@/components/lab/TileBackground'
import { BuildingSprite } from '@/components/lab/BuildingSprite'
import { FeaturePanel } from '@/components/lab/FeaturePanel'
import { ShopPanel } from '@/components/lab/ShopPanel'
import { TeamPanel } from '@/components/lab/TeamPanel'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { ActivityPanel } from '@/components/lab/ActivityPanel'
import { FeedbackPanel } from '@/components/lab/FeedbackPanel'
import { PhaseAdvance } from '@/components/lab/PhaseAdvance'
import { RequestAdvance } from '@/components/lab/RequestAdvance'
import { StatusStrip, type Currency } from '@/components/lab/StatusStrip'
import { Activity, MessageSquare } from 'lucide-react'
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
  /** Live team size — building costs scale by it (Feature 1c). */
  memberCount: number
  /** Literature-phase advance gate, or null when no gate applies (Feature 1e). */
  advance: AdvanceProgress | null
  /** Teacher-gated advance affordance (research_planning/working), or null. */
  advanceRequest: { toPhase: Phase; pending: boolean } | null
  /** Stable per-team seed so the tiled background never reshuffles. */
  seed?: number
  /** When 'feedback', auto-opens the Feedback panel on mount (deep-link). */
  initialPanel?: 'feedback'
}

export function LabScene({
  teamName,
  phase,
  labType,
  currency,
  memberCount,
  advance,
  advanceRequest,
  seed = 1,
  initialPanel,
}: LabSceneProps) {
  const [openKey, setOpenKey] = useState<Gateway['key'] | null>(null)
  const [shopOpen, setShopOpen] = useState(false)
  const [teamOpen, setTeamOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [unresolvedCount, setUnresolvedCount] = useState(0)

  // Auto-open the Feedback panel on mount when the deep-link requests it.
  useEffect(() => {
    if (initialPanel === 'feedback') setFeedbackOpen(true)
  }, [initialPanel])

  // Seed the badge count once on mount by fetching the unresolved count.
  useEffect(() => {
    fetch('/api/team/feedback')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setUnresolvedCount(d.unresolvedCount) })
      .catch(() => {})
  }, [])

  const skin: GatewaySkin = (labType ?? 'generic') as GatewaySkin

  // TODO: restore phase gating once progression is wired up.
  // For now show all buildings so each feature can be built and tested independently.
  const present = GATEWAYS

  const openGateway = openKey ? (GATEWAYS.find((g) => g.key === openKey) ?? null) : null
  const FeatureComponent = openKey ? FEATURE_COMPONENTS[openKey] : null

  function lockInfo(g: Gateway): { locked: boolean; reason?: string } {
    // Presence already implies the feature's phase is met; mirror the same gate
    // the server enforces.
    if (!isFeatureUnlocked(phase, g.feature)) {
      return {
        locked: true,
        reason: `Unlocks at ${PHASE_INFO[FEATURE_MIN_PHASE[g.feature]].label}`,
      }
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
            onOpenSettings={() => setSettingsOpen(true)}
          />

          {advance && <PhaseAdvance progress={advance} />}
          {advanceRequest && (
            <RequestAdvance toPhase={advanceRequest.toPhase} pending={advanceRequest.pending} />
          )}

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

            {/* Activity feed — anchored bottom-left of the lab viewport. */}
            <button
              type="button"
              className="activity-fab font-pixel"
              onClick={() => setActivityOpen(true)}
              title="Team activity"
              aria-label="Open team activity"
            >
              <Activity size={16} />
              <span className="activity-fab__label">LOG</span>
            </button>

            {/* Teacher feedback — anchored bottom-left, above activity. */}
            <button
              type="button"
              className="feedback-fab font-pixel"
              onClick={() => setFeedbackOpen(true)}
              title="Teacher feedback"
              aria-label="Open teacher feedback"
            >
              <MessageSquare size={16} />
              <span className="feedback-fab__label">FEEDBACK</span>
              {unresolvedCount > 0 && (
                <span className="feedback-fab__badge" aria-label={`${unresolvedCount} unread`}>
                  {unresolvedCount > 9 ? '9+' : unresolvedCount}
                </span>
              )}
            </button>

            {/* Dev fill — only rendered in development, bottom-left above activity. */}
            {process.env.NODE_ENV === 'development' && (
              <DevFillButton />
            )}
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
              labType={labType}
              onClose={() => setShopOpen(false)}
            />
          )}

          {teamOpen && <TeamPanel onClose={() => setTeamOpen(false)} />}

          {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

          {activityOpen && <ActivityPanel onClose={() => setActivityOpen(false)} />}

          {feedbackOpen && (
            <FeedbackPanel
              onClose={() => setFeedbackOpen(false)}
              onUnresolvedCount={setUnresolvedCount}
            />
          )}
        </div>
      )}
    </LabCurrencyProvider>
  )
}

// ─── Dev utility: one-click fill of 25 ready papers ──────────────────────────

function DevFillButton() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function fill() {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/dev/fill-papers', { method: 'POST' })
      const data = await res.json()
      setMsg(res.ok ? `✓ ${data.created} papers added` : data.error ?? 'Error')
    } catch {
      setMsg('Request failed')
    } finally {
      setBusy(false)
      setTimeout(() => setMsg(null), 3000)
    }
  }

  return (
    <button
      type="button"
      className="dev-fab font-pixel"
      onClick={fill}
      disabled={busy}
      title="[DEV] Fill 25 papers"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/nova-lab-logo.png" alt="" width={24} height={24} className="pixel-art dev-fab__icon" />
      <span className="dev-fab__label">{msg ?? 'DEV'}</span>
    </button>
  )
}
