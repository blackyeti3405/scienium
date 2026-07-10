'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TileBackground } from '@/components/lab/TileBackground'
import { LabPlot, type PlacedItem, type PlotGhost } from '@/components/lab/LabPlot'
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
import { Activity, MessageSquare, Move, X } from 'lucide-react'
import { getISOWeek, getISOWeekYear } from 'date-fns'
import { BusyButton } from '@/components/ui/BusyButton'
import { LabCurrencyProvider, useLabCurrency } from '@/lib/labCurrency'
import { FEATURE_COMPONENTS } from '@/lib/featureRegistry'
import { GATEWAYS, type Gateway } from '@/lib/gateways'
import { shopBuilding, type ShopBuilding } from '@/lib/shop'
import { sellRefund, upgradeKpCost, upgradeLcCost, MAX_BUILDING_LEVEL } from '@/lib/economy'
import { type GatewaySkin } from '@/lib/sprites/manifest'
import { cellToScreen, CLUSTER_Y, type IsoPos } from '@/lib/plot'
import type { AdvanceProgress } from '@/lib/team/advance'
import { type Phase, type LabType } from '@/lib/phase'

/** An economy building placed on the plot (key = shop building key). */
export interface PlacedEconomy {
  key: string
  gx: number
  gy: number
  costPaid: number
  level: number
}

/** A gateway's effective position (per-team override or its default cell). */
export interface PlacedGateway {
  key: string
  gx: number
  gy: number
}

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

/** The building attached to the cursor — a placement, or a pick-up move. */
type Ghost =
  | { mode: 'new'; building: ShopBuilding }
  | { mode: 'place-owned'; building: ShopBuilding }
  | { mode: 'move-economy'; key: string; from: IsoPos; costPaid: number; level: number }
  | { mode: 'move-gateway'; key: string; from: IsoPos }

/**
 * Pixel-art upgrade particle: a 7×7 cross/sparkle (thin arms, rounded centre)
 * drawn as one rect per row, shaded top→bottom in stepped greens (a pixel-art
 * green gradient). Rendered crisp (image-rendering: pixelated, shape-rendering:
 * crispEdges in CSS).
 */
const PARTICLE_ROWS: ReadonlyArray<readonly [x: number, w: number, fill: string]> = [
  [2, 1, '#d6ffdd'],
  [1, 3, '#7ff2a0'],
  [0, 5, '#46e06a'],
  [1, 3, '#2bb858'],
  [2, 1, '#147a37'],
]

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
  const { currency, addCurrency, setCurrency } = useLabCurrency()

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

  // Plot state — authoritative client mirror of the DB, seeded from SSR props.
  const [economy, setEconomy] = useState<PlacedEconomy[]>(placedBuildings)
  const [gateways, setGateways] = useState<PlacedGateway[]>(gatewayPositions)
  const [unplaced, setUnplaced] = useState<string[]>(unplacedKeys)
  const [arrangeMode, setArrangeMode] = useState(false)
  const [ghost, setGhost] = useState<Ghost | null>(null)
  const [hoveredName, setHoveredName] = useState<string | null>(null)
  /** A placed economy building clicked in REGULAR mode → opens its Sell/Upgrade menu. */
  const [selected, setSelected] = useState<string | null>(null)
  /** True while the current ghost's place/move POST is in flight — pulses the
   *  ghost sprite so a 1–3s round trip doesn't look unresponsive. */
  const [placing, setPlacing] = useState(false)
  /** Building key currently mid-sell or mid-upgrade (drives the menu's BusyButtons). */
  const [sellingKey, setSellingKey] = useState<string | null>(null)
  const [upgradingKey, setUpgradingKey] = useState<string | null>(null)
  /** Transient green particle burst over a just-upgraded building. */
  const [burst, setBurst] = useState<{ gx: number; gy: number; id: number } | null>(null)
  const burstSeq = useRef(0)
  const [toast, setToast] = useState<string | null>(null)

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

  // Auto-dismiss the toast.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  // Clear the upgrade particle burst after it plays (rise + small stagger).
  useEffect(() => {
    if (!burst) return
    const t = setTimeout(() => setBurst(null), 1100)
    return () => clearTimeout(t)
  }, [burst])

  const skin: GatewaySkin = (labType ?? 'generic') as GatewaySkin

  const openGateway = openKey ? (GATEWAYS.find((g) => g.key === openKey) ?? null) : null
  const FeatureComponent = openKey ? FEATURE_COMPONENTS[openKey] : null

  const cancelGhost = useCallback(() => setGhost(null), [])

  // Esc closes the Sell/Upgrade menu first, then the active ghost, then arrange mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (selected) setSelected(null)
      else if (ghost) setGhost(null)
      else if (arrangeMode) setArrangeMode(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [ghost, arrangeMode, selected])

  async function post(url: string, body: unknown) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
    return data
  }

  async function refreshPlotState() {
    try {
      const res = await fetch('/api/buildings')
      if (!res.ok) return
      const data = await res.json()
      setEconomy(data.economy)
      setGateways(data.gateways)
      setUnplaced(data.unplaced)
      setCurrency({ kp: data.kp, lc: data.lc, clearanceLevel: data.clearanceLevel })
    } catch {
      // Immediate rollback already restored the previous local state.
    }
  }

  // Start placing a building chosen from the shop. Owned (unplaced) buildings are
  // free to position; the rest are purchased when dropped.
  function beginPlace(building: ShopBuilding, owned: boolean) {
    setShopOpen(false)
    setArrangeMode(false)
    setSelected(null)
    setGhost(owned ? { mode: 'place-owned', building } : { mode: 'new', building })
  }

  function onPick(kind: 'economy' | 'gateway', key: string, from: IsoPos) {
    setHoveredName(null) // the picked-up building unmounts; drop any stale hover name
    setSelected(null)
    if (kind === 'gateway') {
      setGhost({ mode: 'move-gateway', key, from })
    } else {
      const item = economy.find((e) => e.key === key)
      setGhost({ mode: 'move-economy', key, from, costPaid: item?.costPaid ?? 0, level: item?.level ?? 1 })
    }
  }

  /** Regular-mode click on a placed economy building → open its Sell/Upgrade menu. */
  function onSelectEconomy(key: string | null) {
    setHoveredName(null)
    setSelected(key)
  }

  async function onDrop(gx: number, gy: number) {
    const g = ghost
    if (!g || placing) return
    setPlacing(true)

    if (g.mode === 'new' || g.mode === 'place-owned') {
      const key = g.building.key
      const predictedCost = g.mode === 'new' ? g.building.cost * Math.max(1, memberCount) : 0
      setEconomy((prev) => [
        ...prev,
        { key, gx, gy, costPaid: predictedCost, level: 1 },
      ])
      setUnplaced((prev) => prev.filter((item) => item !== key))
      if (predictedCost > 0) addCurrency({ kp: -predictedCost })
      setGhost(null)

      try {
        const data = await post('/api/buildings/place', { key, gx, gy })
        setEconomy((prev) =>
          prev.map((item) =>
            item.key === key
              ? {
                  ...item,
                  costPaid: data.building.costPaid,
                  level: data.building.level ?? item.level,
                }
              : item,
          ),
        )
        setCurrency({ kp: data.kp })
      } catch (err) {
        setEconomy((prev) => prev.filter((item) => item.key !== key))
        if (g.mode === 'place-owned') setUnplaced((prev) => [...prev, key])
        if (predictedCost > 0) addCurrency({ kp: predictedCost })
        setToast(err instanceof Error ? err.message : 'Something went wrong')
        await refreshPlotState()
      } finally {
        setPlacing(false)
      }
      return
    }

    const previous = g.from
    if (g.mode === 'move-economy') {
      setEconomy((prev) =>
        prev.map((item) => (item.key === g.key ? { ...item, gx, gy } : item)),
      )
    } else {
      setGateways((prev) =>
        prev.map((item) => (item.key === g.key ? { ...item, gx, gy } : item)),
      )
    }
    setGhost(null)

    try {
      if (g.mode === 'move-economy') {
        await post('/api/buildings/move', { kind: 'economy', key: g.key, gx, gy })
      } else {
        await post('/api/buildings/move', { kind: 'gateway', key: g.key, gx, gy })
      }
    } catch (err) {
      if (g.mode === 'move-economy') {
        setEconomy((prev) =>
          prev.map((item) =>
            item.key === g.key ? { ...item, gx: previous.gx, gy: previous.gy } : item,
          ),
        )
      } else {
        setGateways((prev) =>
          prev.map((item) =>
            item.key === g.key ? { ...item, gx: previous.gx, gy: previous.gy } : item,
          ),
        )
      }
      setToast(err instanceof Error ? err.message : 'Something went wrong')
      await refreshPlotState()
    } finally {
      setPlacing(false)
    }
  }

  /** Remove a placed economy building (90% KP refund). Used by arrange-mode Delete
   *  and the regular-mode menu's Sell. */
  async function sellBuilding(key: string) {
    if (sellingKey) return
    setSellingKey(key)
    try {
      const data = await post('/api/buildings/sell', { key })
      setEconomy((prev) => prev.filter((e) => e.key !== key))
      setCurrency({ kp: data.kp })
      setGhost(null)
      setSelected(null)
      setToast(`Sold ${shopBuilding(key)?.name ?? 'building'} for ${data.refund} KP`)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not sell')
    } finally {
      setSellingKey(null)
    }
  }

  /** Upgrade a placed economy building one level (LC cost). Keeps it selected so the
   *  menu shows the next level/cost. */
  async function upgradeBuilding(key: string) {
    const b = economy.find((e) => e.key === key)
    if (!b || b.level >= MAX_BUILDING_LEVEL || upgradingKey) return
    const base = shopBuilding(key)?.cost ?? 0
    const kpCost = upgradeKpCost(base, b.level + 1)
    const lcCost = upgradeLcCost(b.level + 1)
    setUpgradingKey(key)
    const optimisticLevel = b.level + 1
    setEconomy((prev) =>
      prev.map((item) =>
        item.key === key
          ? { ...item, level: optimisticLevel, costPaid: item.costPaid + kpCost }
          : item,
      ),
    )
    addCurrency({ kp: -kpCost, lc: -lcCost })
    setBurst({ gx: b.gx, gy: b.gy, id: ++burstSeq.current })

    try {
      const data = await post('/api/buildings/upgrade', { key })
      setEconomy((prev) =>
        prev.map((e) =>
          e.key === key
            ? { ...e, level: data.level, costPaid: data.costPaid ?? e.costPaid + kpCost }
            : e,
        ),
      )
      setCurrency({ kp: data.kp, lc: data.lc })
      setToast(`Upgraded ${shopBuilding(key)?.name ?? 'building'} to L${data.level}`)
    } catch (err) {
      setEconomy((prev) =>
        prev.map((item) =>
          item.key === key
            ? { ...item, level: b.level, costPaid: b.costPaid }
            : item,
        ),
      )
      addCurrency({ kp: kpCost, lc: lcCost })
      setToast(err instanceof Error ? err.message : 'Could not upgrade')
      await refreshPlotState()
    } finally {
      setUpgradingKey(null)
    }
  }

  // What the plot renders — exclude the picked-up building so the ghost is its only
  // representation while moving.
  const movingGatewayKey = ghost && ghost.mode === 'move-gateway' ? ghost.key : null
  const movingEconomyKey = ghost && ghost.mode === 'move-economy' ? ghost.key : null
  const plotGateways: PlacedItem[] = gateways
    .filter((g) => g.key !== movingGatewayKey)
    .map(({ key, gx, gy }) => ({ key, gx, gy }))
  const plotEconomy: PlacedItem[] = economy
    .filter((e) => e.key !== movingEconomyKey)
    .map(({ key, gx, gy, level }) => ({ key, gx, gy, level }))

  const plotGhost: PlotGhost | null = ghost
    ? ghost.mode === 'move-gateway'
      ? { kind: 'gateway', key: ghost.key }
      : ghost.mode === 'move-economy'
        ? { kind: 'economy', key: ghost.key, level: ghost.level }
        : { kind: 'economy', key: ghost.building.key, level: 1 }
    : null

  const ownedSet = new Set(economy.map((e) => e.key))
  const unplacedSet = new Set(unplaced)

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
          const name = shopBuilding(b.key)?.name ?? b.key
          const maxed = b.level >= MAX_BUILDING_LEVEL
          const upKp = upgradeKpCost(shopBuilding(b.key)?.cost ?? 0, b.level + 1)
          const upLc = upgradeLcCost(b.level + 1)
          const upCostLabel = `${upKp.toLocaleString()} KP${upLc > 0 ? ` + ${upLc} LC` : ''}`
          return (
            <div className="plot-menu font-pixel">
              <span className="plot-menu__title">
                {name} · L{b.level}
              </span>
              <div className="plot-menu__actions">
                <BusyButton
                  busy={sellingKey === b.key}
                  busyLabel="Selling…"
                  showSpinner={false}
                  onClick={() => sellBuilding(b.key)}
                  disabled={placing || upgradingKey === b.key}
                  className="plot-menu__sell"
                >
                  Sell · +{sellRefund(b.costPaid).toLocaleString()} KP
                </BusyButton>
                {maxed ? (
                  <span className="plot-menu__upgrade plot-menu__upgrade--max">Max level</span>
                ) : (
                  <BusyButton
                    busy={upgradingKey === b.key}
                    busyLabel="Upgrading…"
                    showSpinner={false}
                    onClick={() => upgradeBuilding(b.key)}
                    disabled={placing || sellingKey === b.key}
                    className="plot-menu__upgrade"
                  >
                    Upgrade to L{b.level + 1} · {upCostLabel}
                  </BusyButton>
                )}
              </div>
              <button
                type="button"
                className="plot-menu__close"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          )
        })()}

        {/* Green particle burst over a just-upgraded building — covers it then
            dissipates outward. */}
        {burst && (() => {
          const { dx, dy } = cellToScreen(burst.gx, burst.gy)
          const N = 24
          return (
            <div
              key={burst.id}
              className="upgrade-burst"
              style={{ left: `calc(50% + ${dx}px)`, top: `calc(50% + ${CLUSTER_Y + dy}px)` }}
              aria-hidden="true"
            >
              {Array.from({ length: N }, (_, i) => {
                // Scatter each particle's origin across the building footprint (sx, sy
                // from the tile centre) so they rise from all over it, not one point.
                const sx = Math.round(Math.cos(i * 1.8) * 24)
                const sy = Math.round(-4 + Math.sin(i * 2.3) * 14)
                return (
                  // Wrapper does the steady vertical RISE; the inner sprite does a smooth
                  // sine SWAY (ease-in-out alternate) — together a smooth snaking curve.
                  // A per-particle negative sway delay varies the phase so they don't sync.
                  <span
                    key={i}
                    className="upgrade-burst__p"
                    style={{ left: `${sx}px`, top: `${sy}px`, animationDelay: `${(i % 4) * 0.07}s` }}
                  >
                    <svg
                      className="upgrade-burst__spark"
                      viewBox="0 0 5 5"
                      style={{ animationDelay: `-${(i % 5) * 0.09}s` }}
                      aria-hidden="true"
                    >
                      {PARTICLE_ROWS.map(([x, w, fill], y) => (
                        <rect key={y} x={x} y={y} width={w} height={1} fill={fill} />
                      ))}
                    </svg>
                  </span>
                )
              })}
            </div>
          )
        })()}

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
          onPlace={beginPlace}
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
      <img src="/scienium-logo.png" alt="" width={24} height={24} className="pixel-art dev-fab__icon" />
      <span className="dev-fab__label">{msg ?? 'DEV'}</span>
    </button>
  )
}
