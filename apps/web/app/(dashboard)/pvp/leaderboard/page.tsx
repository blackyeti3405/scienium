/**
 * PvP Class Leaderboard page — /pvp/leaderboard
 *
 * Displays sorted trophy rankings for all teams in the requesting team's class.
 * Class-only per D-20 (no school/global tabs).
 *
 * Depends on: GET /api/pvp/leaderboard, PixelSkeleton for loading state.
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'

// ─── Types ──────────────────────────────────────────────────────────────────

interface RankingEntry {
  teamId: string
  teamName: string
  labType: string | null
  trophies: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatLabType(lt: string | null): string {
  if (!lt) return 'Unknown'
  return lt.charAt(0).toUpperCase() + lt.slice(1)
}

/**
 * Dark page shell. `(dashboard)/layout.tsx` sets no background, so these cards —
 * styled for a dark surface — were rendering grey-on-white with white text.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0d1b2e]">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Class Rankings</h1>
          <Link
            href="/lab"
            className="text-sm text-[#F5C518] hover:text-amber-300 underline underline-offset-2 transition-colors"
          >
            ← Back to lab
          </Link>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch leaderboard data on mount ────────────────────────────────────

  useEffect(() => {
    fetch('/api/pvp/leaderboard')
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`)
        return r.json()
      })
      .then((data) => {
        setRankings(data.rankings ?? [])
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  // ── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <Shell>
        {[1, 2, 3, 4, 5].map((i) => (
          <PixelSkeleton key={i} variant="line" h="h-14" w="w-full" />
        ))}
      </Shell>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────

  if (error) {
    return (
      <Shell>
        <div className="bg-red-900/40 border border-red-700/50 rounded-lg px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      </Shell>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────

  if (rankings.length === 0) {
    return (
      <Shell>
        <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 px-5 py-8 text-center">
          <p className="text-slate-400 text-sm">
            No rankings yet — raids start after the first team places a base.
          </p>
        </div>
      </Shell>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <Shell>
      {/* Ranked list */}
      <div className="space-y-2">
        {rankings.map((entry, index) => {
          const rank = index + 1
          const isTopThree = rank <= 3
          // Gold for #1, silver for #2, bronze for #3, standard for rest
          const medalColor =
            rank === 1
              ? 'text-[#F5C518]'
              : rank === 2
                ? 'text-slate-300'
                : rank === 3
                  ? 'text-amber-700'
                  : 'text-slate-500'

          return (
            <div
              key={entry.teamId}
              className={`
                flex items-center gap-4
                bg-slate-800/60 rounded-xl border px-5 py-4
                transition-colors
                ${isTopThree ? 'border-slate-600/60' : 'border-slate-700/50'}
              `}
            >
              {/* Rank number */}
              <span
                className={`text-lg font-bold w-8 text-center shrink-0 ${medalColor}`}
                style={
                  isTopThree
                    ? { fontFamily: 'var(--font-pixel), monospace' }
                    : {}
                }
              >
                {rank === 1 ? '1' : rank === 2 ? '2' : rank === 3 ? '3' : `#${rank}`}
              </span>

              {/* Team info */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-white font-semibold truncate"
                  style={
                    isTopThree
                      ? { fontFamily: 'var(--font-pixel), monospace', fontSize: '10px' }
                      : {}
                  }
                >
                  {entry.teamName}
                </p>
                <p className="text-xs text-slate-500">
                  {formatLabType(entry.labType)} Lab
                </p>
              </div>

              {/* Trophy count */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-sm text-[#F5C518]" role="img" aria-label="trophy">
                  🏆
                </span>
                <span className="text-sm font-semibold text-white tabular-nums">
                  {entry.trophies}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="text-xs text-slate-500 text-center pt-2">
        Rankings update after each raid completes.
      </p>
    </Shell>
  )
}