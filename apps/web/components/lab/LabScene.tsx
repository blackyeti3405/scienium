'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TileBackground } from '@/components/lab/TileBackground'
import { DecorationLayer } from '@/components/lab/DecorationLayer'
import { LabPlot } from '@/components/lab/LabPlot'
import { buildingArtBox } from '@/lib/plot'
import { FeaturePanel } from '@/components/lab/FeaturePanel'
import { ShopPanel } from '@/components/lab/ShopPanel'
import { TeamPanel } from '@/components/lab/TeamPanel'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { ActivityPanel } from '@/components/lab/ActivityPanel'
import { FeedbackPanel, type FeedbackItem } from '@/components/lab/FeedbackPanel'
import { PhaseAdvance } from '@/components/lab/PhaseAdvance'
import { StatusStrip, type Currency } from '@/components/lab/StatusStrip'
import { MomentumCard } from '@/components/lab/MomentumCard'
import { BuildingMenu } from '@/components/lab/BuildingMenu'
import { UpgradeBurst } from '@/components/lab/UpgradeBurst'
import { UnlockCeremony } from '@/components/lab/UnlockCeremony'
import { DevFillButton } from '@/components/lab/DevFillButton'
import { Activity, MessageSquare, Move, X } from 'lucide-react'
import { getISOWeek, getISOWeekYear } from 'date-fns'
import { BusyButton } from '@/components/ui/BusyButton'
import { LabCurrencyProvider, useLabCurrency } from '@/components/lab/labCurrency'
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


export interface LabSceneProps {
  teamName: string
  phase: Phase
  labType: LabType | null
  currency: Currency
  /** Live team size — building costs scale by it (Feature 1c). */
  memberCount: number
  /** Literature-phase advance gate, or null when no gate applies (Feature 1e). */
  advance: AdvanceProgress | null
  /** Stable per-team seed so the tiled background never reshuffles. */
  seed?: number
  /** When 'feedback', auto-opens the Feedback panel on mount (deep-link). */
  initialPanel?: 'feedback'
  /** Economy buildings already placed on the plot. */
  placedBuildings: PlacedEconomy[]
  /** Gateways this phase unlocked that are neither placed nor acknowledged. */
  pendingUnlock: { phase: Phase; keys: string[] } | null
  /** Economy buildings owned but not yet positioned (legacy rows). */
  unplacedKeys: string[]
  /** Effective gateway positions. */
  gatewayPositions: PlacedGateway[]
}

/** localStorage key for the Momentum card's per-ISO-week dismissal (Feature F10). */
const MOMENTUM_DISMISS_KEY = 'scienium.momentum.dismissed'

/**
 * The lab's off-path panels — one state, so at most one is ever open. §0.7 named
 * six independent booleans (`openKey` + five `xOpen` flags) as a reachable
 * overlap; it is genuinely reachable here (unlike LiteratureFeature's v0.59.0
 * finding, which turned out not to be): `ActivityPanel` is the one overlay with
 * no `ModalBackdrop` — it's a bare right-side `position: fixed` column
 * (`z-index: 1100`, `.activity-panel` in globals.css) with no full-screen scrim
 * and no click-outside-closes handling of its own. Every OTHER trigger not
 * physically under that 340px-wide column — the team-name button, the feedback
 * FAB, a gateway building — stays clickable while it's open, so Activity +
 * Team/Feedback/Feature could genuinely be open at once. A single union makes
 * that structurally impossible rather than relying on each trigger to remember
 * to close the others.
 */
type Overlay =
  | { kind: 'none' }
  | { kind: 'feature'; key: Gateway['key'] }
  | { kind: 'shop' }
  | { kind: 'team' }
  | { kind: 'settings' }
  | { kind: 'activity' }
  | { kind: 'feedback' }

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
  seed = 1,
  initialPanel,
  placedBuildings,
  pendingUnlock,
  unplacedKeys,
  gatewayPositions,
}: LabSceneProps) {
  const { currency } = useLabCurrency()

  const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' })
  const closeOverlay = useCallback(() => setOverlay({ kind: 'none' }), [])
  const [unresolvedCount, setUnresolvedCount] = useState(0)
  const [feedbackSnapshot, setFeedbackSnapshot] = useState<{
    items: FeedbackItem[]
    unresolvedCount: number
  } | null>(null)
  // True once ANY feedback data has been recorded (warm-up fetch or the panel
  // itself). The mount fetch below checks it so a slow response can never
  // clobber newer state the open panel already reported (F1 AC5 flake).
  const feedbackSeededRef = useRef(false)
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
    beginPlaceGateway,
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
    if (initialPanel === 'feedback') setOverlay({ kind: 'feedback' })
  }, [initialPanel])

  useEffect(() => {
    fetch('/api/team/feedback')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        // Warm-start only: if the panel already reported (user opened it before
        // this resolved), our data was requested EARLIER and must not win.
        if (d && !feedbackSeededRef.current) {
          feedbackSeededRef.current = true
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

  // Ground the decor layer must leave bare — the buildings' ART boxes, not their
  // tiles. Both are measured from the cluster centre, which is the same space
  // the scatter works in, so these drop straight through.
  // The ceremony is server-derived, so a reload replays exactly the same state.
  // Acknowledging it is what ends it — opening the shop is the acknowledgement,
  // which is also the action it is asking for.
  const [unlockDone, setUnlockDone] = useState(false)
  const ceremony = !unlockDone && pendingUnlock ? pendingUnlock : null

  async function acknowledgeUnlock() {
    setUnlockDone(true) // optimistic: the overlay must never outlive the click
    try {
      await fetch('/api/team/unlock-ack', { method: 'POST' })
    } catch {
      // Non-fatal. Worst case the ceremony replays on the next load, which is
      // far better than trapping the student under a scrim we cannot dismiss.
    }
  }

  const placedGatewayKeys = useMemo(
    () => new Set(plotGateways.map((g) => g.key)),
    [plotGateways],
  )

  const decorBlocked = useMemo(
    () => [...plotGateways, ...plotEconomy].map(({ gx, gy }) => buildingArtBox(gx, gy)),
    [plotGateways, plotEconomy],
  )

  const skin: GatewaySkin = (labType ?? 'generic') as GatewaySkin

  const openKey = overlay.kind === 'feature' ? overlay.key : null
  const openGateway = openKey ? (GATEWAYS.find((g) => g.key === openKey) ?? null) : null
  const FeatureComponent = openKey ? FEATURE_COMPONENTS[openKey] : null

  /** Shop pick → close the shop, then hand the ghost to the plot hook. */
  function handlePlace(building: ShopBuilding, owned: boolean) {
    closeOverlay()
    beginPlace(building, owned)
  }

  /** Same, for a gateway the team has unlocked but not yet put down. */
  function handlePlaceGateway(key: string) {
    closeOverlay()
    beginPlaceGateway(key)
  }

  return (
    <div className={`lab-scene${ceremony ? ' lab-scene--unlocking' : ''}`}>
      <StatusStrip
        teamName={teamName}
        phase={phase}
        labType={labType}
        currency={currency}
        onOpenTeam={() => setOverlay({ kind: 'team' })}
        onOpenSettings={() => setOverlay({ kind: 'settings' })}
      />

      {advance && <PhaseAdvance progress={advance} />}

      <div className="lab-scene__viewport">
        <TileBackground seed={seed} />
        <DecorationLayer seed={seed} blocked={decorBlocked} />

        {!momentumDismissed && <MomentumCard onDismiss={handleDismissMomentum} />}

        <LabPlot
          labType={labType}
          skin={skin}
          gateways={plotGateways}
          economy={plotEconomy}
          arrangeMode={arrangeMode}
          ghost={plotGhost}
          onOpenGateway={(key) => setOverlay({ kind: 'feature', key: key as Gateway['key'] })}
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
          return banner ? (
            <div className="plot-banner font-pixel" aria-live="polite">
              {banner}
            </div>
          ) : null
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

        {ceremony && <UnlockCeremony count={ceremony.keys.length} />}

        {/* Buildings shop — anchored bottom-right of the lab viewport. */}
        <button
          type="button"
          className="shop-button font-pixel"
          onClick={() => {
            if (ceremony) void acknowledgeUnlock()
            setOverlay({ kind: 'shop' })
          }}
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
          onClick={() => setOverlay({ kind: 'activity' })}
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
          onClick={() => setOverlay({ kind: 'feedback' })}
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
        <FeaturePanel title={openGateway.label} onClose={closeOverlay}>
          <FeatureComponent phase={phase} />
        </FeaturePanel>
      )}

      {overlay.kind === 'shop' && (
        <ShopPanel
          currency={currency}
          memberCount={memberCount}
          labType={labType}
          ownedKeys={ownedSet}
          unplacedKeys={unplacedSet}
          phase={phase}
          placedGatewayKeys={placedGatewayKeys}
          highlightGatewayKeys={pendingUnlock?.keys ?? []}
          onPlace={handlePlace}
          onPlaceGateway={handlePlaceGateway}
          onClose={closeOverlay}
        />
      )}

      {overlay.kind === 'team' && <TeamPanel onClose={closeOverlay} />}
      {overlay.kind === 'settings' && <SettingsPanel onClose={closeOverlay} />}
      {overlay.kind === 'activity' && <ActivityPanel onClose={closeOverlay} />}
      {overlay.kind === 'feedback' && (
        <FeedbackPanel
          onClose={closeOverlay}
          onUnresolvedCount={setUnresolvedCount}
          initialData={feedbackSnapshot}
          onDataChange={(d) => {
            feedbackSeededRef.current = true
            setFeedbackSnapshot(d)
          }}
        />
      )}
    </div>
  )
}
