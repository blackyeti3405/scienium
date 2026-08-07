'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  SPELL_POWER_TIERS,
  SPELL_POWER_MAX_TASKS,
  spellPowerTierFor,
} from '@scienium/shared-types'

/**
 * PvP Battle Arena — the raid lobby, rendered inside the lab's FeaturePanel
 * overlay and reached by clicking the Battle Arena gateway.
 *
 * Fills its parent (`h-full`) so it can mount inside the gateway overlay panel
 * (FeaturePanel), which provides the title bar, close button and pixel framing.
 * This is the ONLY lobby — the near-identical standalone `/pvp/lobby` route was
 * a copy of this file and has been deleted.
 */
export function PvpFeature() {
  const router = useRouter()

  // ── State ──────────────────────────────────────────────────────────────

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trophies, setTrophies] = useState(0)
  const [spellPower, setSpellPower] = useState({
    tier: 'NONE' as string,
    multiplier: 0.5,
    tasksCompleted: 0,
  })
  const [quota, setQuota] = useState({
    raidsRemaining: 0,
    refindsRemaining: 0,
  })
  const [opponent, setOpponent] = useState<{
    id: string
    name: string
    labType: string | null
    trophies: number
  } | null>(null)
  const [actionLoading, setActionLoading] = useState<'raid' | 'refind' | null>(null)

  // ── Fetch initial state on mount ───────────────────────────────────────

  useEffect(() => {
    fetch('/api/pvp')
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`)
        return r.json()
      })
      .then((data) => {
        setTrophies(data.trophies ?? 0)
        setSpellPower(
          data.spellPower ?? { tier: 'NONE', multiplier: 0.5, tasksCompleted: 0 },
        )
        setQuota({
          raidsRemaining: data.quota?.raidsRemaining ?? 0,
          refindsRemaining: data.quota?.refindsRemaining ?? 0,
        })
        setOpponent(data.opponent ?? null)
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  // ── Actions ────────────────────────────────────────────────────────────

  async function handleRefind() {
    setActionLoading('refind')
    setError(null)
    try {
      const r = await fetch('/api/pvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refind' }),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error ?? 'Refind failed')
        return
      }
      setOpponent(data.opponent ?? null)
      setQuota((prev) => ({
        ...prev,
        refindsRemaining: Math.max(0, prev.refindsRemaining - 1),
      }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleStartRaid() {
    if (!opponent) return
    setActionLoading('raid')
    setError(null)
    try {
      const r = await fetch('/api/pvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_raid',
          opponentTeamId: opponent.id,
        }),
      })
      const data = await r.json()
      if (!r.ok) {
        setError(data.error ?? 'Failed to start raid')
        return
      }
      setQuota((prev) => ({
        ...prev,
        raidsRemaining: Math.max(0, prev.raidsRemaining - 1),
      }))
      // Stash the session data for the BattleScreen to read on mount
      if (data.session) {
        try {
          sessionStorage.setItem('pvp_active_raid_session', JSON.stringify(data.session))
        } catch { /* sessionStorage full — BattleScreen shows fallback */ }
      }
      router.push(`/pvp/battle/${data.raidId}`)
    } catch (err: any) {
      setError(err.message)
      setActionLoading(null)
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────

  const currentTier = spellPowerTierFor(spellPower.tasksCompleted)
  const fillPct = Math.min(
    100,
    (spellPower.tasksCompleted / SPELL_POWER_MAX_TASKS) * 100,
  )
  const formatLabType = (lt: string | null) =>
    lt ? lt.charAt(0).toUpperCase() + lt.slice(1) : 'Unknown'

  // ── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="relative flex h-full flex-col bg-[#0d1b2e] text-white">
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-slate-400 animate-pulse font-pixel text-[9px]">
            Loading battle arena…
          </p>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="relative flex h-full flex-col bg-[#0d1b2e] text-white overflow-y-auto">
      <div className="max-w-xl mx-auto w-full space-y-5 px-5 py-6">
        {/* Error banner */}
        {error && (
          <div className="bg-red-900/40 border border-red-700/50 rounded-lg px-4 py-3 text-red-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              className="underline hover:text-red-200 ml-3 shrink-0"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Trophy count */}
        <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-label="trophy">
              🏆
            </span>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">
                Trophies
              </p>
              <p className="text-2xl font-bold text-white">{trophies}</p>
            </div>
          </div>
        </div>

        {/* Spell Power Meter */}
        <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-300">
              Spell Power Meter
            </p>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full text-white ${currentTier.color}`}
            >
              {currentTier.label}
            </span>
          </div>

          {/* Meter bar with 4 discrete notch positions */}
          <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${currentTier.color}`}
              style={{ width: `${fillPct}%` }}
            />
            {[0, 20, 60, 100].map((pos, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-0.5 bg-slate-900/60"
                style={{ left: `${pos}%` }}
              />
            ))}
          </div>

          {/* Notch labels */}
          <div className="flex justify-between text-[10px] text-slate-500 px-0.5">
            {SPELL_POWER_TIERS.map((t) => (
              <span key={t.tier}>{t.label}</span>
            ))}
          </div>

          {/* Explanatory text */}
          <p className="text-xs text-slate-500">
            {spellPower.tasksCompleted === 0
              ? 'Complete daily tasks to charge your spells'
              : `${spellPower.tasksCompleted} task${spellPower.tasksCompleted === 1 ? '' : 's'} completed today — ${spellPower.multiplier}x spell damage`}
          </p>
        </div>

        {/* Daily quota + leaderboard */}
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span>
            ⚔️ {quota.raidsRemaining} raid{quota.raidsRemaining !== 1 ? 's' : ''} left today
          </span>
          <span>
            🔄 {quota.refindsRemaining} refind{quota.refindsRemaining !== 1 ? 's' : ''} left today
          </span>
          <button
            onClick={() => router.push('/pvp/leaderboard')}
            className="ml-auto text-[#F5C518] hover:text-amber-300 underline underline-offset-2 transition-colors"
          >
            🏅 Leaderboard
          </button>
        </div>

        {/* Opponent card */}
        {opponent ? (
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 px-5 py-5 space-y-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">
                Matched Opponent
              </p>
              <p className="text-xl font-bold text-white">{opponent.name}</p>
              <p className="text-sm text-slate-400">
                {formatLabType(opponent.labType)} Lab
              </p>
              <p className="text-sm text-slate-400">
                🏆 {opponent.trophies} trophies
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleStartRaid}
                disabled={quota.raidsRemaining === 0 || actionLoading !== null}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                {actionLoading === 'raid' ? 'Starting…' : '⚔️ Raid'}
              </button>
              <button
                onClick={handleRefind}
                disabled={quota.refindsRemaining === 0 || actionLoading !== null}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 font-medium rounded-lg transition-colors text-sm"
              >
                {actionLoading === 'refind' ? '…' : `🔄 Refind (${quota.refindsRemaining})`}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 px-5 py-8 text-center">
            <p className="text-slate-400 text-sm">
              No opponents found in your class.
            </p>
            <p className="text-slate-500 text-xs mt-1">
              Opponents appear once other teams in your class have placed buildings.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PvpFeature