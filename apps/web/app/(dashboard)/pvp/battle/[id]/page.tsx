/**
 * BattleScreen — playable raid UI for the PvP system.
 *
 * Layout (top-to-bottom):
 *   HUD bar (timer + meter tier)  →  Defender base, drawn on the real isometric
 *   plot at each building's own (posX, posY) via lib/plot.ts  →  Type-cycle [?]
 *   tooltip  →  Spell bar (selectable spells with per-spell cooldown state)
 *
 * Cast flow:
 *   1. Click spell in spell bar → gold highlight ring
 *   2. Hover the base → a tile-radius ring shows the blast; every building
 *      inside it highlights green
 *   3. Click any cell → POST /api/pvp/{battleId}/action
 *   4. Server response updates local defenderBase state (no client damage compute)
 *   5. That spell enters ITS OWN cooldown (spell.castDelay, 2s–6s by catalog);
 *      the server enforces the same per-spell window
 *
 * When timer expires OR all buildings destroyed, server auto-completes the raid
 * and the client transitions to the ResultsScreen overlay.
 *
 * Depends on: TileBackground (z-0 grass), PixelProgressBar, TypeCycleTooltip,
 * POST /api/pvp/{battleId}/action, sessionStorage for initial session data.
 */

'use client'

import { use, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { TileBackground } from '@/components/lab/TileBackground'
import { TypeCycleTooltip, TYPE_COLORS } from '@/lib/pvp/type-cycle'
import { cellToScreen, STEP_X, STEP_Y, CLUSTER_Y, BUILDING_PX } from '@/lib/plot'
import { getBuildingSprite, getGatewaySprite, getSpellIcon, getSpellFx } from '@/lib/sprites/manifest'
import type { GatewayKey, GatewaySkin } from '@/lib/sprites/manifest'
import { SPELL_POWER_TIERS } from '@scienium/shared-types'
import type { BuildingTarget, Spell, RaidSession, RaidResult, LabType } from '@scienium/shared-types'

const RAID_TIME_LIMIT_MS = 15_000

/**
 * Health bar colour: green when healthy, through amber, to red at death's door.
 *
 * A hue sweep rather than three hard-coded steps, so the bar reads as a
 * continuous drain — you can see a building sliding toward red mid-raid instead
 * of watching it snap between buckets. 120deg (green) to 0deg (red).
 */
function healthColor(pct: number): string {
  // Biased rather than linear. On a linear ramp a building at 60% HP still
  // reads plain green, so a base under real pressure looked untouched; the
  // exponent pulls the amber/red range up so damage is legible early.
  const t = Math.max(0, Math.min(1, pct / 100))
  return `hsl(${Math.pow(t, 1.6) * 120}, 85%, 45%)`
}

/** How long a cast effect stays on the plot before it is culled. */
const CAST_FX_MS = 900
/** A lingering spell's cloud hangs around noticeably longer than a burst. */
const LINGER_FX_MS = 2600

// ─── Keys ───────────────────────────────────────────────────────────────────

const SESSION_STORAGE_KEY = 'pvp_active_raid_session'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Distance between two plot cells, in TILES. Building positions and the cast
 * point are both plot coordinates (lib/plot.ts gx/gy), and `spell.aoeRadius` is
 * a tile radius, so this compares like with like. It previously compared tile
 * coordinates against an 80-PIXEL radius, which meant every building on the plot
 * was always inside every blast.
 */
function tileDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

// ─── BattleScreen ────────────────────────────────────────────────────────────

export default function BattlePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const raidId = use(params).id

  // ── Core state ──────────────────────────────────────────────────────────

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Defender buildings (mutable — updated from server responses)
  const [defenderBase, setDefenderBase] = useState<BuildingTarget[]>([])
  // Attacker spells
  const [spellsAvailable, setSpellsAvailable] = useState<Spell[]>([])
  // Server-provided attack multiplier (display only — the server applies the
  // real multiplier per cast)
  const [powerMul, setPowerMul] = useState<number | null>(null)
  const [defenderLabType, setDefenderLabType] = useState<LabType | null>(null)

  // Raid temporal state
  const [startedAt, setStartedAt] = useState<number>(0)
  const [remainingMs, setRemainingMs] = useState(RAID_TIME_LIMIT_MS)
  const [ended, setEnded] = useState(false)
  const [result, setResult] = useState<RaidResult | null>(null)

  // Cast interaction state
  const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null)
  const [cooldownUntil, setCooldownUntil] = useState<Record<string, number>>({})
  const [hoveredTarget, setHoveredTarget] = useState<{ x: number; y: number } | null>(null)
  const [casting, setCasting] = useState(false)

  // Live cast effects on the plot. Each is a still PNG that CSS expands and
  // fades; `key` is monotonic so re-casting the same cell restarts the animation.
  const [casts, setCasts] = useState<
    { key: number; x: number; y: number; type: string; radius: number; lingering: boolean }[]
  >([])
  const castSeq = useRef(0)

  // Prevents duplicate finalize calls when both timer-expiry and all-destroyed
  // effects fire in the same tick.
  const finalizingRef = useRef(false)

  // used for keyboard focus management
  const gridRef = useRef<HTMLDivElement>(null)

  // ── Load session data on mount ──────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (raw) {
        const session: RaidSession = JSON.parse(raw)
        if (session.id === raidId) {
          setDefenderBase(session.defenderBase)
          setSpellsAvailable(session.spellsAvailable)
          setStartedAt(session.startedAt)
          setDefenderLabType(session.defenderLabType ?? null)

          // Clean up storage immediately so reloads don't reuse stale data
          sessionStorage.removeItem(SESSION_STORAGE_KEY)
        }
      }
    } catch {
      // ignore parse errors — fall through to loading
    }
    setLoading(false)
    // Meter HUD: fetch the team's live tier; best-effort, defaults to 1.0x.
    fetch('/api/pvp/spell-power')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setPowerMul(d.multiplier) })
      .catch(() => {})
  }, [raidId])

  // ── Timer countdown (client-side only; server authoritative) ────────────

  // Refs to avoid stale closures in setInterval
  const startedAtRef = useRef(startedAt)
  startedAtRef.current = startedAt
  const endedRef = useRef(ended)
  endedRef.current = ended

  useEffect(() => {
    if (startedAt <= 0 || ended) return
    const tick = () => {
      const elapsed = Date.now() - startedAtRef.current
      const remaining = Math.max(0, RAID_TIME_LIMIT_MS - elapsed)
      setRemainingMs(remaining)

      if (remaining <= 0 && !endedRef.current) {
        // Timer expired — server will reject future casts;
        // transition to results via the action route response
        clearInterval(interval)
      }
    }
    tick()
    const interval = setInterval(tick, 100)
    return () => clearInterval(interval)
  }, [startedAt, ended])

  // ── Cast a spell ────────────────────────────────────────────────────────

  const handleCast = useCallback(
    async (spellId: string, x: number, y: number) => {
      if (casting || ended) return
      setCasting(true)
      setError(null)

      try {
        const r = await fetch(`/api/pvp/${raidId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cast_spell',
            spellId,
            x,
            y,
            clientTs: Date.now(),
          }),
        })

        const data = await r.json()
        if (!r.ok) {
          setError(data.error ?? 'Cast failed')
          setCasting(false)
          return
        }

        // Update defender state from server response (client NEVER computes damage)
        if (data.defenderBase) {
          setDefenderBase(data.defenderBase)
        }

        // Show the blast where it actually landed, sized to the spell's radius.
        const cast = spellsAvailable.find((sp) => sp.id === spellId)
        if (cast) {
          const key = ++castSeq.current
          setCasts((prev) => [
            ...prev,
            {
              key,
              x,
              y,
              type: cast.type,
              radius: cast.aoeRadius,
              lingering: cast.lingering === true,
            },
          ])
          window.setTimeout(
            () => setCasts((prev) => prev.filter((c) => c.key !== key)),
            cast.lingering ? LINGER_FX_MS : CAST_FX_MS,
          )
        }

        // Check if raid ended
        if (data.ended && data.result) {
          setEnded(true)
          setResult(data.result)
        } else {
          // Start this spell's own cooldown — cooldowns are per-spell and come
          // from the catalog (2s generic … 6s signature), not one global 1.5s.
          const cd =
            spellsAvailable.find((s) => s.id === spellId)?.castDelay ?? 1500
          setCooldownUntil((prev) => ({ ...prev, [spellId]: Date.now() + cd }))
        }
      } catch (err: any) {
        setError(err.message)
      }
      setCasting(false)
    },
    [raidId, casting, ended, spellsAvailable],
  )

  // ── Spell selection ─────────────────────────────────────────────────────

  const selectedSpell = spellsAvailable.find((s) => s.id === selectedSpellId)

  // AOE radius for valid target highlight
  const aoeRadius = selectedSpell?.aoeRadius ?? 80

  // ── Auto-deselect spell on cooldown ────────────────────────────────────

  useEffect(() => {
    if (!selectedSpellId) return
    const until = cooldownUntil[selectedSpellId]
    if (until && Date.now() >= until) {
      // allow re-selection
    }
  }, [cooldownUntil, selectedSpellId])

  // ── Timer display ───────────────────────────────────────────────────────

  const timerSeconds = (remainingMs / 1000).toFixed(1)
  const timerLow = remainingMs < 5000

  // ── Derived: all buildings destroyed? ───────────────────────────────────

  const allDestroyed =
    defenderBase.length > 0 && defenderBase.every((b) => b.currentHealth <= 0)

  // ── Power tier label (shared table — see @scienium/shared-types) ────────

  const tierLabel =
    powerMul === null
      ? '…'
      : (SPELL_POWER_TIERS.find((t) => t.multiplier === powerMul)?.label ?? '…')

  // ── Finalize helper (shared by timer-expiry + all-destroyed effects) ──

  const handleFinalize = useCallback(async () => {
    if (ended || finalizingRef.current) return
    finalizingRef.current = true
    try {
      const r = await fetch(`/api/pvp/${raidId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      })
      const data = await r.json()
      if (data.ended && data.result) {
        setEnded(true)
        setResult(data.result)
        if (data.defenderBase) {
          setDefenderBase(data.defenderBase)
        }
      }
    } catch {
      // Network error — leave finalizingRef = true so we don't
      // re-spam; the user can still click a building to trigger a cast
      // which will finalize via finalizeFromStoredLog.
    }
  }, [raidId, ended])

  // ── Timer expiry: auto-finalize when remainingMs hits 0 ─────────────

  useEffect(() => {
    if (remainingMs <= 0 && !ended && !finalizingRef.current) {
      handleFinalize()
    }
  }, [remainingMs, ended, handleFinalize])

  // ── All-destroyed: auto-finalize without waiting for a click ─────────

  useEffect(() => {
    if (allDestroyed && !ended && !finalizingRef.current) {
      handleFinalize()
    }
  }, [allDestroyed, ended, handleFinalize])

  // ── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="lab-scene__viewport flex items-center justify-center" style={{ background: '#10131f' }}>
        <p className="text-sm text-slate-400 animate-pulse">Loading battle arena...</p>
      </div>
    )
  }

  // ── Error / no session state ───────────────────────────────────────────

  if (defenderBase.length === 0 && spellsAvailable.length === 0) {
    return (
      <div className="lab-scene__viewport flex flex-col items-center justify-center gap-4" style={{ background: '#10131f' }}>
        <p className="text-slate-300 text-lg font-semibold">Battle data not found</p>
        <p className="text-slate-500 text-sm">This raid may have expired or the session data was lost.</p>
        <button
          onClick={() => router.push('/lab?feature=pvp')}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          Return to Battle Arena
        </button>
      </div>
    )
  }

  // ── Results screen overlay ─────────────────────────────────────────────

  if (ended && result) {
    const victory = result.percentDestroyed >= 30
    const trophyIsPositive = result.trophyDelta >= 0

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-slate-800/90 border border-slate-700/50 rounded-xl p-8 max-w-md w-full mx-4 space-y-6">
          {/* Title */}
          <h2 className="text-xl font-semibold text-white text-center">
            {victory ? 'Raid Complete' : 'Raid Over'}
          </h2>

          {/* Percent destroyed */}
          <div className="text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
              Buildings Destroyed
            </p>
            <p
              className={`text-3xl font-bold ${victory ? 'text-[#F5C518]' : 'text-red-400'}`}
            >
              {Math.round(result.percentDestroyed)}%
            </p>
          </div>

          {/* Trophy delta */}
          <div className="text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
              Trophy Change
            </p>
            <p
              className={`text-3xl font-bold ${trophyIsPositive ? 'text-[#5ef08a]' : 'text-red-400'}`}
            >
              {trophyIsPositive ? '+' : ''}
              {result.trophyDelta} 🏆
            </p>
          </div>

          {/* Building summary */}
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            <p className="text-xs text-slate-400 uppercase tracking-wide">
              Defender Buildings
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {defenderBase.map((b) => {
                const destroyed = b.currentHealth <= 0
                return (
                  <div
                    key={b.buildingId}
                    className={`flex items-center gap-2 p-1.5 rounded text-xs ${
                      destroyed ? 'bg-red-900/30 text-red-300' : 'bg-slate-900/40 text-slate-300'
                    }`}
                  >
                    <span>{destroyed ? 'X' : '-'}</span>
                    <span className="truncate">{b.name}</span>
                    <span className={`ml-auto ${destroyed ? 'text-red-400' : 'text-[#5ef08a]'}`}>
                      {destroyed ? 'Destroyed' : `${Math.round(b.currentHealth)}/${b.maxHealth} HP`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Return to Lobby */}
          <button
            onClick={() => router.push('/lab?feature=pvp')}
            className="w-full px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            Return to Battle Arena
          </button>
        </div>
      </div>
    )
  }

  // ── Main BattleScreen ──────────────────────────────────────────────────

  return (
    <div
      className="lab-scene__viewport flex flex-col"
      style={{ background: '#10131f', minHeight: '100vh', overflow: 'hidden' }}
    >
      {/* ═══ HUD Bar ═══ */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/90 border-b border-slate-700/50 shrink-0">
        {/* Timer */}
        <div className={`flex items-center gap-2 ${timerLow ? 'text-red-400' : 'text-slate-200'}`}>
          <span className="font-semibold text-sm">Timer:</span>
          <span className={`font-bold tabular-nums ${timerLow ? 'animate-pulse' : ''}`}>
            {timerSeconds}s
          </span>
          {timerLow && <span className="text-xs text-red-400">remaining</span>}
        </div>

        {/* Meter tier badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">PWR:</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-amber-400">
            {tierLabel}
          </span>
          <span className="text-xs text-slate-500">{powerMul === null ? '…' : `${powerMul}x`}</span>
        </div>
      </div>

      {/* ═══ Defender Grid ═══ */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* TileBackground at z-0 */}
        <div className="absolute inset-0 z-0">
          <TileBackground seed={42} />
        </div>

        {/* Defender buildings at z-1, laid out on the real isometric plot.
            `absolute inset-0` + a zero-size origin gives a stable cluster centre
            — percentage offsets resolved against a flex box that collapses. */}
        <div
          ref={gridRef}
          className="absolute inset-0 z-10 flex items-center justify-center"
          role="grid"
          aria-label="Defender base"
        >
        <div className="relative" style={{ width: 0, height: 0 }}>
          {/* Blast preview: a tile-radius ring centred on the hovered cell. */}
          {hoveredTarget && selectedSpellId && (
            <div
              aria-hidden
              className="pointer-events-none absolute rounded-full border-2 border-[#5ef08a]/70 bg-[#5ef08a]/10"
              style={{
                left: cellToScreen(hoveredTarget.x, hoveredTarget.y).dx,
                top: cellToScreen(hoveredTarget.x, hoveredTarget.y).dy + CLUSTER_Y,
                width: aoeRadius * STEP_X * 2,
                height: aoeRadius * STEP_Y * 2,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}

          {[...defenderBase]
            // Iso draw order: further cells first so nearer buildings overlap them.
            .sort(
              (a, b) =>
                a.position.x + a.position.y - (b.position.x + b.position.y),
            )
            .map((b) => {
            const destroyed = b.currentHealth <= 0
            const hpPct = Math.max(0, (b.currentHealth / b.maxHealth) * 100)
            const inBlast =
              hoveredTarget !== null &&
              selectedSpellId !== null &&
              tileDistance(
                hoveredTarget.x,
                hoveredTarget.y,
                b.position.x,
                b.position.y,
              ) <= aoeRadius
            const { dx, dy } = cellToScreen(b.position.x, b.position.y)

            return (
              <button
                key={b.buildingId}
                onClick={() => {
                  // Cast at THIS cell — everything within the spell's tile radius
                  // takes damage, so clicking a building in the blast is aiming.
                  if (selectedSpellId) {
                    handleCast(selectedSpellId, b.position.x, b.position.y)
                  }
                }}
                onMouseEnter={() => setHoveredTarget({ x: b.position.x, y: b.position.y })}
                onMouseLeave={() => setHoveredTarget(null)}
                onFocus={() => setHoveredTarget({ x: b.position.x, y: b.position.y })}
                onBlur={() => setHoveredTarget(null)}
                disabled={destroyed}
                className={`
                  absolute flex flex-col items-center justify-end p-1
                  transition-all duration-200 outline-none
                  ${destroyed ? 'opacity-40 cursor-default' : 'cursor-pointer'}
                  ${inBlast ? 'ring-2 ring-[#5ef08a] bg-[#5ef08a]/10' : ''}
                  focus-visible:ring-2 focus-visible:ring-amber-400
                `}
                style={{
                  // The building's OWN sprite footprint (lib/plot's BUILDING_PX),
                  // not a ground-tile cell.
                  // This box used to be TILE_CELL (64px) with the sprite, health
                  // bar, HP text, type and name stacked inside it — so the art
                  // was squeezed to half the size the lab renders it at, which
                  // is why a raid looked like a village of miniatures. The bar
                  // is now overlaid rather than stacked, so the box is free to
                  // be exactly one building.
                  width: BUILDING_PX,
                  height: BUILDING_PX,
                  left: dx,
                  top: dy + CLUSTER_Y,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10 + b.position.x + b.position.y,
                }}
                aria-label={`${b.name}, ${b.type} building, HP ${Math.round(b.currentHealth)}/${b.maxHealth}`}
                tabIndex={0}
              >
                {/* The defender's actual building sprite — same art the lab
                    scene renders, picked by the defender's lab skin and the
                    building's upgrade stage. Falls back to an initial tile for
                    raids snapshotted before `sprite` existed. */}
                {(() => {
                  // Two sprite sets: gateways are keyed by lab SKIN, economy
                  // buildings by upgrade TIER. A gateway carries its key in
                  // `sprite` and has no level, so it must not go through the
                  // tier resolver — that returns null and drops it to the
                  // letter-tile placeholder.
                  const entry = !b.sprite
                    ? null
                    : b.isGateway
                      ? getGatewaySprite(b.sprite as GatewayKey, (defenderLabType ?? 'generic') as GatewaySkin)
                      : defenderLabType
                        ? getBuildingSprite(defenderLabType, b.sprite, b.level)
                        : null
                  if (!entry) {
                    return (
                      <div
                        className={`w-12 h-12 rounded-sm border-2 flex items-center justify-center text-[8px] font-semibold pixel-art ${
                          destroyed
                            ? 'border-red-900/60 bg-red-900/30 text-red-400'
                            : 'border-slate-600/50 bg-slate-700/40 text-slate-300'
                        }`}
                        style={{ imageRendering: 'pixelated' }}
                      >
                        {destroyed ? 'X' : b.name.charAt(0).toUpperCase()}
                      </div>
                    )
                  }
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.path}
                      alt=""
                      aria-hidden
                      // The sprite's own display size — srcWidth x scale, the
                      // same arithmetic the lab scene uses — so a raided base
                      // is drawn at exactly the size the defender built it.
                      width={entry.srcWidth * entry.scale}
                      height={entry.srcHeight * entry.scale}
                      className={destroyed ? 'grayscale brightness-50' : ''}
                      style={{ imageRendering: 'pixelated', objectFit: 'contain', maxWidth: 'none' }}
                    />
                  )
                })()}

                {/* Health bar, pinned ACROSS THE TOP of the building and
                    overlaid rather than stacked underneath. Overlapping a
                    neighbouring sprite is fine and deliberate: keeping the
                    building art full-size matters more than keeping the bars
                    from touching, and the bar sits above its own building so
                    which bar belongs to which is never ambiguous. */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] pointer-events-none">
                  <div className="h-1.5 w-full rounded-sm bg-black/70 ring-1 ring-black/50 overflow-hidden">
                    <div
                      className="h-full rounded-sm transition-[width,background-color] duration-200"
                      style={{ width: `${hpPct}%`, background: healthColor(hpPct) }}
                    />
                  </div>
                  <span className="block text-center text-[7px] leading-none pt-0.5 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.95)]">
                    {Math.round(b.currentHealth)}/{b.maxHealth}
                  </span>
                </div>

                {/* Name + type, pinned to the BOTTOM so they never push the
                    sprite out of its own box the way the stacked layout did. */}
                <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
                  <span className="block text-[9px] text-white font-semibold leading-tight truncate text-center [text-shadow:0_1px_2px_rgba(0,0,0,0.95)]">
                    {b.name}
                  </span>
                  <span
                    className={`block text-center text-[8px] font-medium leading-tight ${TYPE_COLORS[b.type] ?? 'text-slate-500'} [text-shadow:0_1px_2px_rgba(0,0,0,0.95)]`}
                  >
                    {b.type}
                  </span>
                </div>

                {/* Destroyed overlay */}
                {destroyed && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-red-400 text-lg font-bold" style={{ fontFamily: 'var(--font-pixel)' }}>
                      X
                    </span>
                  </div>
                )}
              </button>
            )
          })}

          {/* ═══ Cast FX ═══ — stills scaled/faded by CSS (globals.css), sized
              to the spell's tile radius so the blast matches what it damaged. */}
          {casts.map((c) => {
            const { dx, dy } = cellToScreen(c.x, c.y)
            const w = c.radius * STEP_X * 2
            const h = c.radius * STEP_Y * 2
            const ground = getSpellFx(c.lingering ? 'linger' : 'blast', c.type)
            const flash = getSpellFx('impact', c.type)
            return (
              <div
                key={c.key}
                aria-hidden
                className="pointer-events-none absolute"
                style={{
                  // Zero-size anchor ON the cell; both children are positioned
                  // relative to it. Centring the wrapper with translate(-50%)
                  // AND offsetting the children double-shifts the blast off target.
                  left: dx,
                  top: dy + CLUSTER_Y,
                  width: 0,
                  height: 0,
                  zIndex: 60,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ground.path}
                  alt=""
                  className={c.lingering ? 'pvp-fx-linger' : 'pvp-fx-blast'}
                  style={{
                    position: 'absolute',
                    left: -w / 2,
                    top: -h / 2,
                    width: w,
                    height: h,
                    // Tailwind preflight sets `img { max-width: 100% }`, and this
                    // image's containing block is the zero-width anchor above —
                    // without this the blast collapses to 0px wide.
                    maxWidth: 'none',
                    imageRendering: 'pixelated',
                  }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={flash.path}
                  alt=""
                  className="pvp-fx-impact"
                  style={{
                    position: 'absolute',
                    left: -24,
                    top: -24,
                    width: 48,
                    height: 48,
                    maxWidth: 'none',
                    imageRendering: 'pixelated',
                  }}
                />
              </div>
            )
          })}
        </div>
        </div>
      </div>

      {/* ═══ Type-Cycle Tooltip ═══ */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-800/60 border-t border-slate-700/30 shrink-0">
        <p className="text-xs text-slate-500">Type effectiveness</p>
        <TypeCycleTooltip />
      </div>

      {/* ═══ Spell Bar ═══ */}
      <div className="shrink-0 bg-slate-800/90 border-t border-slate-700/50 px-4 py-2">
        {spellsAvailable.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            No spells available — place buildings first.
          </p>
        ) : (
          <div className="flex gap-2 justify-center">
            {spellsAvailable.map((spell) => {
              const isSelected = selectedSpellId === spell.id
              const onCooldown = (cooldownUntil[spell.id] ?? 0) > Date.now()
              const cooldownRemaining = Math.max(
                0,
                ((cooldownUntil[spell.id] ?? 0) - Date.now()) / 1000,
              )

              return (
                <button
                  key={spell.id}
                  onClick={() => {
                    if (!onCooldown) {
                      setSelectedSpellId(isSelected ? null : spell.id)
                    }
                  }}
                  disabled={onCooldown}
                  className={`
                    flex flex-col items-center justify-center gap-0.5
                    rounded-lg px-2 py-1.5 transition-all duration-200
                    ${onCooldown ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-1 cursor-pointer'}
                    ${isSelected
                      ? 'ring-2 ring-[#F5C518] bg-[#F5C518]/10'
                      : 'bg-slate-700/40 ring-1 ring-slate-600/50'
                    }
                    focus-visible:ring-2 focus-visible:ring-amber-400
                  `}
                  style={{ minWidth: 96, maxWidth: 132 }}
                  aria-label={`${spell.name} (${spell.type}) — ${spell.damage} damage`}
                  tabIndex={0}
                >
                  {/* Icon: shape = behaviour, colour = type, emblem = source building */}
                  {spell.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getSpellIcon(spell.icon, spell.type).path}
                      alt=""
                      aria-hidden
                      width={40}
                      height={40}
                      style={{ imageRendering: 'pixelated' }}
                    />
                  )}

                  {/* Spell name (pixel font) */}
                  <span
                    className="text-white text-center leading-tight"
                    style={{
                      fontFamily: 'var(--font-pixel), monospace',
                      fontSize: '8px',
                      lineHeight: 1.5,
                    }}
                  >
                    {spell.name}
                  </span>

                  {/* Type label */}
                  <span className={`text-[9px] font-medium ${TYPE_COLORS[spell.type] ?? 'text-slate-400'}`}>
                    {spell.type}
                  </span>

                  {/* Damage stat */}
                  <span className="text-[9px] text-slate-400">{spell.damage} dmg</span>

                  {/* Cooldown countdown */}
                  {onCooldown && (
                    <span className="text-[9px] text-red-400">
                      {cooldownRemaining.toFixed(1)}s
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ═══ Error banner ═══ */}
      {error && (
        <div className="absolute top-12 left-4 right-4 z-40 bg-red-900/80 border border-red-700/60 rounded-lg px-4 py-2 text-red-200 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            className="underline hover:text-red-100 ml-3"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}