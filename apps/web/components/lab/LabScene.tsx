'use client'

import { useEffect, useState } from 'react'
import { TileBackground } from '@/components/lab/TileBackground'
import { DecorationLayer } from '@/components/lab/DecorationLayer'
import { LabPlot } from '@/components/lab/LabPlot'
import { FeaturePanel } from '@/components/lab/FeaturePanel'
import { ShopPanel } from '@/components/lab/ShopPanel'
import { TeamPanel } from '@/components/lab/TeamPanel'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { ActivityPanel } from '@/components/lab/ActivityPanel'
import { FeedbackPanel, type FeedbackItem } from '@/components/lab/FeedbackPanel'
import { PhaseAdvance } from '@/components/lab/PhaseAdvance'
import { SelfAdvance } from '@/components/lab/SelfAdvance'
import { StatusStrip, type Currency } from '@/components/lab/StatusStrip'
import { MomentumCard } from '@/components/lab/MomentumCard'
import { BuildingMenu } from '@/components/lab/BuildingMenu'
import { UpgradeBurst } from '@/components/lab/UpgradeBurst'
import { DevFillButton } from '@/components/lab/DevFillButton'
import { Activity, MessageSquare, Move, X } from 'lucide-react'
import { getISOWeek, getISOWeekYear } from 'date-fns'
import { BusyButton } from '@/components/ui/BusyButton'
import { LabCurrencyProvider, useLabCurrency } from '@/lib/labCurrency'
import { FEATURE_COMPONENTS } from '@/lib/featureRegistry'
import { GATEWAYS, type Gateway } from '@/lib/gateways'
import { type ShopBuilding } from '@/lib/shop'
import { sellRefund } from '@/lib/economy'
import { type GatewaySkin } from '@/lib/sprites/manifest'
import {
  usePlotBuildings,
  type PlacedEconomy,
  type PlacedGateway,
} from '@/lib/hooks/usePlotBuildings'
import type { AdvanceProgress } from '@/lib/team/advance'
import { type Phase, type LabType } from '@/lib/phase'

export type { PlacedEconomy, PlacedGateway }

export interface LabSceneProps {
  teamName: string
  phase: Phase
  labType: LabType | null
  currency: Currency
  /** Live team size — building costs scale by it (Feature 1c). */
  memberCount: number
  /** Literature-phase advance gate, or null when no gate applies (Feature 1e). */
  advance: AdvanceProgress | null
  /** Self-paced advance affordance (research_planning/working), or null. */
  selfAdvance: { toPhase: Phase } | null
  /** Stable per-team seed so the tiled background never reshuffles. */
  seed?: number
  /** When 'feedback', auto-opens the Feedback panel on mount (deep-link). */
  initialPanel?: 'feedback'
  /** Economy buildings already placed on the plot. */
  placedBuildings: PlacedEconomy[]
  /** Economy buildings owned but not yet positioned (legacy rows). */
  unplacedKeys: string[]
  /** Effective gateway positions. */
  gatewayPositions: PlacedGateway[]
}

/** localStorage key for the Momentum card's per-ISO-week dismissal (Feature F10). */
const MOMENTUM_DISMISS_KEY = 'scienium.momentum.dismissed'

/** Current ISO-week tag, e.g. "2026-W27" — same scheme as lib/notifications/compute.ts. */
function currentIsoWeekTag(): string {
  const now = new Date()
  return `${getISOWeekYear(now)}-W${getISOWeek(now)}`
}

export function LabScene(props: LabSceneProps) {
  return (
    <LabCurrencyProvider initial={props.currency}>
      {() => <LabSceneContent {...props} />}
    </LabCurrencyProvider>
  )
}

function LabSceneContent({
  teamName,
  phase,
  labType,
  memberCount,
  advance,
  selfAdvance,
  seed = 1,
  initialPanel,
  placedBuildings,
  unplacedKeys,
  gatewayPositions,
}: LabSceneProps) {
  const { currency } = useLabCurrency()

  const [openKey, setOpenKey] = useState<Gateway['key'] | null>(null)
  const [shopOpen, setShopOpen] = useState(false)
  const [teamOpen, setTeamOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [unresolvedCount, setUnresolvedCount] = useState(0)
  const [feedbackSnapshot, setFeedbackSnapshot] = useState<{
    items: FeedbackItem[]
    unresolvedCount: number
  } | null>(null)
  // Momentum card (Feature F10) — default hidden until the mount effect below
  // decides, based on whether THIS ISO week's tag is already recorded as dismissed.
  const [momentumDismissed, setMomentumDismissed] = useState(true)

  const {
    economy,
    arrangeMode,
    setArrangeMode,
    ghost,
    setGhost,
    cancelGhost,
    hoveredName,
    setHoveredName,
    selected,
    setSelected,
    placing,
    sellingKey,
    upgradingKey,
    burst,
    toast,
    beginPlace,
    onPick,
    onSelectEconomy,
    onDrop,
    sellBuilding,
    upgradeBuilding,
    plotGateways,
    plotEconomy,
    plotGhost,
    ownedSet,
    unplacedSet,
  } = usePlotBuildings({ placedBuildings, unplacedKeys, gatewayPositions, memberCount })

  useEffect(() => {
    if (initialPanel === 'feedback') setFeedbackOpen(true)
  }, [initialPanel])

  useEffect(() => {
    fetch('/api/team/feedback')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setUnresolvedCount(d.unresolvedCount)
          setFeedbackSnapshot({ items: d.items, unresolvedCount: d.unresolvedCount })
        }
      })
      .catch(() => {})
  }, [])

  // Momentum card dismissal is remembered client-side, keyed to the ISO week
  // (sanctioned ephemeral UI state — not game data, no server persistence).
  // SSR/private-mode safe: try/catch + typeof window guard.
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const stored = window.localStorage.getItem(MOMENTUM_DISMISS_KEY)
      setMomentumDismissed(stored === currentIsoWeekTag())
    } catch {
      setMomentumDismissed(false)
    }
  }, [])

  function handleDismissMomentum() {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(MOMENTUM_DISMISS_KEY, currentIsoWeekTag())
      }
    } catch {
      // best-effort; still hide the card for this session even if storage fails
    }
    setMomentumDismissed(true)
  }

  const skin: GatewaySkin = (labType ?? 'generic') as GatewaySkin

  const openGateway = openKey ? (GATEWAYS.find((g) => g.key === openKey) ?? null) : null
  const FeatureComponent = openKey ? FEATURE_COMPONENTS[openKey] : null

  /** Shop pick → close the shop, then hand the ghost to the plot hook. */
  function handlePlace(building: ShopBuilding, owned: boolean) {
    setShopOpen(false)
    beginPlace(building, owned)
  }

  return (
    <div className="lab-scene">
      <StatusStrip
        teamName={teamName}
        phase={phase}
        labType={labType}
        currency={currency}
        onOpenTeam={() => setTeamOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {advance && <PhaseAdvance progress={advance} />}
      {selfAdvance && <SelfAdvance toPhase={selfAdvance.toPhase} />}

      <div className="lab-scene__viewport">
        <TileBackground seed={seed} />
        <DecorationLayer seed={seed} />

        {!momentumDismissed && <MomentumCard onDismiss={handleDismissMomentum} />}

        <LabPlot
          labType={labType}
          skin={skin}
          gateways={plotGateways}
          economy={plotEconomy}
          arrangeMode={arrangeMode}
          ghost={plotGhost}
          onOpenGateway={(key) => setOpenKey(key as Gateway['key'])}
          onPick={onPick}
          onDrop={onDrop}
          onCancel={cancelGhost}
          onHoverBuilding={setHoveredName}
          onSelectEconomy={onSelectEconomy}
        />

        {/* Top-of-screen banner: the hovered building's name takes priority; otherwise
            the current edit-mode instruction (placing/moving/arranging). */}
        {(() => {
          const banner = ghost
            ? ghost.mode === 'move-economy' || ghost.mode === 'move-gateway'
              ? 'Click a tile to move · Esc / right-click to cancel'
              : 'Click a tile to place · Esc / right-click to cancel'
            : hoveredName
              ? hoveredName
              : arrangeMode
                ? 'Arrange mode — click a building to move or delete'
                : null
          return banner ? <div className="plot-banner font-pixel">{banner}</div> : null
        })()}

        {/* Arrange mode: while an economy building is picked up, the only action is
            Delete (remove for a 90% KP refund). Gateways aren't deletable. */}
        {ghost?.mode === 'move-economy' && (
          <BusyButton
            busy={sellingKey === ghost.key}
            busyLabel="Deleting…"
            onClick={() => sellBuilding(ghost.key)}
            className="plot-delete font-pixel"
          >
            Delete · +{sellRefund(ghost.costPaid).toLocaleString()} KP
          </BusyButton>
        )}

        {/* Regular mode: clicking a placed economy building opens its Sell + Upgrade
            menu (no moving). */}
        {selected && !ghost && (() => {
          const b = economy.find((e) => e.key === selected)
          if (!b) return null
          return (
            <BuildingMenu
              building={b}
              placing={placing}
              sellingKey={sellingKey}
              upgradingKey={upgradingKey}
              onSell={sellBuilding}
              onUpgrade={upgradeBuilding}
              onClose={() => setSelected(null)}
            />
          )
        })()}

        {/* Green particle burst over a just-upgraded building — covers it then
            dissipates outward. */}
        {burst && <UpgradeBurst key={burst.id} gx={burst.gx} gy={burst.gy} />}

        {toast && <div className="plot-toast font-pixel">{toast}</div>}

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

        {/* Arrange toggle — enter/exit move+sell mode. */}
        <button
          type="button"
          className={`arrange-button font-pixel${arrangeMode ? ' arrange-button--on' : ''}`}
          onClick={() => {
            setGhost(null)
            setSelected(null)
            setArrangeMode((v) => !v)
          }}
          title={arrangeMode ? 'Done arranging' : 'Arrange buildings'}
          aria-label={arrangeMode ? 'Done arranging' : 'Arrange buildings'}
          aria-pressed={arrangeMode}
        >
          {arrangeMode ? <X size={15} /> : <Move size={15} />}
          <span className="arrange-button__label">{arrangeMode ? 'DONE' : 'ARRANGE'}</span>
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

        {process.env.NODE_ENV === 'development' && <DevFillButton />}
      </div>

      {openGateway && FeatureComponent && (
        <FeaturePanel title={openGateway.label} onClose={() => setOpenKey(null)}>
          <FeatureComponent />
        </FeaturePanel>
      )}

      {shopOpen && (
        <ShopPanel
          currency={currency}
          memberCount={memberCount}
          labType={labType}
          ownedKeys={ownedSet}
          unplacedKeys={unplacedSet}
          onPlace={handlePlace}
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
          initialData={feedbackSnapshot}
          onDataChange={setFeedbackSnapshot}
        />
      )}
    </div>
  )
}
