/**
 * Type-cycle constants and tooltip component for the PvP raid system.
 *
 * The type cycle follows empirical > theoretical > applied > empirical,
 * creating a rock-paper-scissors effectiveness matrix with science-flavored
 * one-line explanations.
 *
 * Exports:
 *   - TYPE_ORDER: display order for the three types
 *   - TYPE_CYCLE_EXPLANATIONS: generic cycle explanations (superEffective/resist/neutral)
 *   - TYPE_PAIR_EXPLANATIONS: per-pair effectiveness data for the tooltip table
 *   - TypeCycleTooltip: [?] icon that opens a popover with the type diagram
 */

import { useState, useEffect, useCallback } from 'react'

// ─── Type order (display) ──────────────────────────────────────────────────

export const TYPE_ORDER: Array<{ key: string; label: string }> = [
  { key: 'empirical', label: 'Empirical' },
  { key: 'theoretical', label: 'Theoretical' },
  { key: 'applied', label: 'Applied' },
]

// ─── Generic cycle explanations ────────────────────────────────────────────

export const TYPE_CYCLE_EXPLANATIONS: Record<string, string> = {
  superEffective:
    '"Experiments reveal flaws in theoretical models."',
  resist:
    '"The opposing methodology counters your approach."',
  neutral:
    '"Similar methodologies yield no advantage."',
}

// ─── Per-pair explanations for the tooltip table ───────────────────────────

export const TYPE_PAIR_EXPLANATIONS: Array<{
  attacker: string
  defender: string
  multiplier: number
  explanation: string
}> = [
  {
    attacker: 'empirical',
    defender: 'theoretical',
    multiplier: 2.0,
    explanation:
      'Experiments reveal flaws in theoretical models.',
  },
  {
    attacker: 'theoretical',
    defender: 'applied',
    multiplier: 2.0,
    explanation:
      'Mathematical models predict real-world outcomes.',
  },
  {
    attacker: 'applied',
    defender: 'empirical',
    multiplier: 2.0,
    explanation:
      'Engineered solutions outperform raw discovery.',
  },
  {
    attacker: 'empirical',
    defender: 'empirical',
    multiplier: 1.0,
    explanation: 'Similar methodologies yield no advantage.',
  },
  {
    attacker: 'theoretical',
    defender: 'theoretical',
    multiplier: 1.0,
    explanation: 'Similar methodologies yield no advantage.',
  },
  {
    attacker: 'applied',
    defender: 'applied',
    multiplier: 1.0,
    explanation: 'Similar methodologies yield no advantage.',
  },
  {
    attacker: 'empirical',
    defender: 'applied',
    multiplier: 0.5,
    explanation:
      'The opposing methodology counters your approach.',
  },
  {
    attacker: 'theoretical',
    defender: 'empirical',
    multiplier: 0.5,
    explanation:
      'The opposing methodology counters your approach.',
  },
  {
    attacker: 'applied',
    defender: 'theoretical',
    multiplier: 0.5,
    explanation:
      'The opposing methodology counters your approach.',
  },
]

// ─── Type color mapping ────────────────────────────────────────────────────

export const TYPE_COLORS: Record<string, string> = {
  empirical: 'text-blue-400',
  theoretical: 'text-purple-400',
  applied: 'text-amber-400',
}

export const TYPE_BG_COLORS: Record<string, string> = {
  empirical: 'bg-blue-400/20',
  theoretical: 'bg-purple-400/20',
  applied: 'bg-amber-400/20',
}

// ─── Multiplier badge style ────────────────────────────────────────────────

function multiplierBadge(multiplier: number): string {
  if (multiplier === 2.0) return 'text-[#5ef08a] font-semibold'
  if (multiplier === 0.5) return 'text-red-400 font-semibold'
  return 'text-slate-400'
}

// ─── TypeCycleTooltip React Component ──────────────────────────────────────

/**
 * Renders a [?] icon that opens a detailed popover/panel explaining the
 * type-cycle mechanics. The popover lists all 9 type-pair combinations with
 * their effectiveness and science-flavored explanations.
 *
 * Closes on click-outside or Esc key.
 */
export function TypeCycleTooltip({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((v) => !v), [])
  const close = useCallback(() => setOpen(false), [])

  // Close on Esc
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  // Close on click-outside
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-type-cycle-popover]')) {
        close()
      }
    }
    // Delay binding so the same click that opened doesn't immediately close it
    const id = setTimeout(() => window.addEventListener('click', onClick), 0)
    return () => {
      clearTimeout(id)
      window.removeEventListener('click', onClick)
    }
  }, [open, close])

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors text-xs font-semibold leading-none"
        aria-label="Type cycle explanation"
        title="Type effectiveness chart"
      >
        ?
      </button>

      {open && (
        <div
          data-type-cycle-popover
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 p-4 rounded-lg bg-slate-800 border border-slate-700/60 shadow-xl"
        >
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 border-r border-b border-slate-700/60 rotate-45 -mt-[6px]" />

          <div className="space-y-3">
            {/* Title */}
            <p className="text-sm font-semibold text-slate-200">
              Type Effectiveness
            </p>

            {/* Cycle diagram summary */}
            <div className="text-xs text-slate-400 space-y-1">
              <p>
                <span className="text-blue-400 font-semibold">Empirical</span>
                {' > '}
                <span className="text-purple-400 font-semibold">
                  Theoretical
                </span>
                {' > '}
                <span className="text-amber-400 font-semibold">Applied</span>
                {' > '}
                <span className="text-blue-400 font-semibold">Empirical</span>
              </p>
              <p className="text-slate-500 italic">
                2x if you&apos;re ahead in the cycle, 0.5x if behind, 1x for
                same type.
              </p>
            </div>

            {/* Full pair table */}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {TYPE_PAIR_EXPLANATIONS.map((pair, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs p-1.5 rounded bg-slate-900/40"
                >
                  <span
                    className={`shrink-0 w-16 font-medium ${TYPE_COLORS[pair.attacker] ?? 'text-slate-300'}`}
                  >
                    {pair.attacker}
                  </span>
                  <span className="text-slate-500 shrink-0">
                    {'->'}
                  </span>
                  <span
                    className={`shrink-0 w-16 font-medium ${TYPE_COLORS[pair.defender] ?? 'text-slate-300'}`}
                  >
                    {pair.defender}
                  </span>
                  <span
                    className={`shrink-0 w-6 text-right ${multiplierBadge(pair.multiplier)}`}
                  >
                    {pair.multiplier}x
                  </span>
                  <span className="text-slate-500 leading-tight">
                    {pair.explanation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}