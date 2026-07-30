/**
 * BattleScreen — playable raid UI for the PvP system.
 *
 * Layout (top-to-bottom):
 *   HUD bar (timer + meter tier)  →  Defender grid (TileBackground + building
 *   sprites + health bars + type labels)  →  Type-cycle [?] tooltip  →
 *   Spell bar (selectable spells with cooldown state)
 *
 * Cast flow:
 *   1. Click spell in spell bar → gold highlight ring
 *   2. Hover defender grid → buildings within AOE get green overlay
 *   3. Click highlighted building → POST /api/pvp/{battleId}/action
 *   4. Server response updates local defenderBase state (no client damage compute)
 *   5. Cast spell enters 1.5s cooldown (client-side visual only)
 *
 * When timer expires OR all buildings destroyed, server auto-completes the raid
 * and the client transitions to the ResultsScreen overlay.
 *
 * Depends on: TileBackground (z-0 grass), PixelProgressBar, TypeCycleTooltip,
 * POST /api/pvp/{battleId}/action, sessionStorage for initial session data.
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { TileBackground } from '@/components/lab/TileBackground'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import { TypeCycleTooltip, TYPE_COLORS } from '@/lib/pvp/type-cycle'
import type { BuildingTarget, Spell, RaidSession, RaidResult } from '@scienium/shared-types'

// ─── Cooldown duration (client-side visual only; server enforces 1.5s) ──────

const COOLDOWN_MS = 1500
const RAID_TIME_LIMIT_MS = 15_000

// ─── Grid constants (matching v0.23.0 TILE_CELL) ────────────────────────────

const TILE_CELL = 64
const GRID_COLS = 6
const GRID_ROWS = 4

// ─── Keys ───────────────────────────────────────────────────────────────────

const SESSION_STORAGE_KEY = 'pvp_active_raid_session'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

// ─── BattleScreen ────────────────────────────────────────────────────────────

export default function BattlePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const raidId = params.id

  // ── Core state ──────────────────────────────────────────────────────────

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Defender buildings (mutable — updated from server responses)
  const [defenderBase, setDefenderBase] = useState<BuildingTarget[]>([])
  // Attacker spells
  const [spellsAvailable, setSpellsAvailable] = useState<Spell[]>([])
  // Server-provided tier/multiplier
  const [powerTier, setPowerTier] = useState<string>('NONE')
  const [powerMul, setPowerMul] = useState(1.0)

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

          // Clean up storage immediately so reloads don't reuse stale data
          sessionStorage.removeItem(SESSION_STORAGE_KEY)
        }
      }
    } catch {
      // ignore parse errors — fall through to loading
    }
    setLoading(false)
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

        // Check if raid ended
        if (data.ended && data.result) {
          setEnded(true)
          setResult(data.result)
        } else {
          // Start cooldown for the cast spell
          setCooldownUntil((prev) => ({
            ...prev,
            [spellId]: Date.now() + COOLDOWN_MS,
          }))
        }
      } catch (err: any) {
        setError(err.message)
      }
      setCasting(false)
    },
    [raidId, casting, ended],
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

  // ── Derived: total percent destroyed ────────────────────────────────────

  const totalMaxHealth = defenderBase.reduce((s, b) => s + b.maxHealth, 0)
  const totalDamage = defenderBase.reduce(
    (s, b) => s + (b.maxHealth - Math.max(0, b.currentHealth)),
    0,
  )
  const percentDestroyed =
    totalMaxHealth > 0 ? (totalDamage / totalMaxHealth) * 100 : 0

  // ── Power tier label (v1: linear fill) ──────────────────────────────────

  const tierLabel = (() => {
    if (powerMul >= 2.0) return 'Overcharged'
    if (powerMul >= 1.5) return 'Charged'
    if (powerMul >= 1.0) return 'Active'
    return 'Dormant'
  })()

  // ── Check for auto-complete (all buildings destroyed) ──────────────────

  useEffect(() => {
    if (allDestroyed && !ended) {
      // Send a final "check" — the action route will completeRaid
      // if timer hasn't expired yet. But we can also just wait for
      // the next cast or timer expiry. Let the cast flow handle it.
    }
  }, [allDestroyed, ended])

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
          onClick={() => router.push('/lab')}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          Return to Lobby
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
            onClick={() => router.push('/lab')}
            className="w-full px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            Return to Lobby
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
          <span className="text-xs text-slate-500">{powerMul}x</span>
        </div>
      </div>

      {/* ═══ Defender Grid ═══ */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* TileBackground at z-0 */}
        <div className="absolute inset-0 z-0">
          <TileBackground seed={42} />
        </div>

        {/* Defender buildings at z-1 */}
        <div
          ref={gridRef}
          className="relative z-10 w-full h-full"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_COLS}, ${TILE_CELL}px)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, ${TILE_CELL}px)`,
            gap: 0,
            placeContent: 'center',
          }}
          role="grid"
          aria-label="Defender base"
        >
          {defenderBase.map((b) => {
            const destroyed = b.currentHealth <= 0
            const hpPct = Math.max(0, (b.currentHealth / b.maxHealth) * 100)
            const isHoveredTarget =
              hoveredTarget &&
              selectedSpellId &&
              distance(hoveredTarget.x, hoveredTarget.y, b.position.x, b.position.y) <= aoeRadius
            const isThisBuildingHovered =
              hoveredTarget?.x === b.position.x && hoveredTarget?.y === b.position.y

            return (
              <button
                key={b.buildingId}
                onClick={() => {
                  // Only cast if a spell is selected and this building is in range
                  if (selectedSpellId && isHoveredTarget) {
                    handleCast(selectedSpellId, b.position.x, b.position.y)
                  }
                }}
                onMouseEnter={() => setHoveredTarget({ x: b.position.x, y: b.position.y })}
                onMouseLeave={() => setHoveredTarget(null)}
                onFocus={() => setHoveredTarget({ x: b.position.x, y: b.position.y })}
                onBlur={() => setHoveredTarget(null)}
                disabled={destroyed}
                className={`
                  relative flex flex-col items-center justify-end p-1
                  transition-all duration-200 outline-none
                  ${destroyed ? 'opacity-40 cursor-default' : 'cursor-pointer'}
                  ${isHoveredTarget && selectedSpellId ? 'ring-2 ring-[#5ef08a] bg-[#5ef08a]/10' : ''}
                  ${isThisBuildingHovered && selectedSpellId ? 'ring-2 ring-[#5ef08a]' : ''}
                  focus-visible:ring-2 focus-visible:ring-amber-400
                `}
                style={{
                  width: TILE_CELL,
                  height: TILE_CELL,
                }}
                aria-label={`${b.name}, ${b.type} building, HP ${Math.round(b.currentHealth)}/${b.maxHealth}`}
                tabIndex={0}
              >
                {/* Building placeholder (pixel-art styled block) */}
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

                {/* Health bar */}
                <div className="w-full px-1 mt-1">
                  <PixelProgressBar value={hpPct} />
                </div>

                {/* Health text */}
                <span className="text-[9px] text-slate-400 leading-tight">
                  {Math.round(b.currentHealth)}/{b.maxHealth}
                </span>

                {/* Type label */}
                <span className={`text-[8px] font-medium leading-tight ${TYPE_COLORS[b.type] ?? 'text-slate-500'}`}>
                  {b.type}
                </span>

                {/* Building name */}
                <span className="text-[9px] text-white font-semibold leading-tight truncate max-w-full text-center">
                  {b.name}
                </span>

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
                  style={{ minWidth: 72, maxWidth: 80 }}
                  aria-label={`${spell.name} (${spell.type}) — ${spell.damage} damage`}
                  tabIndex={0}
                >
                  {/* Spell name (pixel font) */}
                  <span
                    className="text-white truncate max-w-full"
                    style={{
                      fontFamily: 'var(--font-pixel), monospace',
                      fontSize: '10px',
                      lineHeight: 1.4,
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