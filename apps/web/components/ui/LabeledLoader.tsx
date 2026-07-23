import type { ReactNode } from 'react'
import { PixelSpinner } from './PixelSpinner'

/**
 * Centered spinner + label — replaces every "lone centered circle" (pattern A)
 * across the app. Two tones encode the house rule:
 *   - `tone="gold"` (default): the *game* is loading.
 *   - `tone="vega"`: Vega (the Anthropic-backed mentor) is thinking — teal,
 *     mandatory dress for every LLM-backed wait. Absorbs the old
 *     `.clr-thinking` treatment.
 *
 * `fill` reproduces the four container sub-variants seen across the app so
 * callers can swap their existing wrapper one-for-one:
 *   - `panel`  — full-panel `bg-[#0d1b2e]`, fills all available space
 *   - `tab`    — `ops-tab-body`-style centered content (no explicit bg)
 *   - `flex-1` — flexes to fill a flex parent, no padding assumptions
 *   - `inline` — no sizing, just centers itself inline (button/card contexts)
 */

export type LabeledLoaderFill = 'panel' | 'tab' | 'flex-1' | 'inline'
export type LabeledLoaderTone = 'gold' | 'vega'

const FILL_CLASS: Record<LabeledLoaderFill, string> = {
  panel: 'h-full w-full bg-[#0d1b2e]',
  tab: 'ops-tab-body items-center justify-center',
  'flex-1': 'flex-1 min-h-0',
  inline: '',
}

const TONE_SPINNER = {
  gold: 'gold',
  vega: 'vega',
} as const

export function LabeledLoader({
  label,
  sublabel,
  tone = 'gold',
  fill = 'inline',
  icon,
  className = '',
}: {
  label: string
  /** Optional secondary line for long waits, e.g. "this can take up to 30 seconds". */
  sublabel?: string
  tone?: LabeledLoaderTone
  fill?: LabeledLoaderFill
  /** Optional icon slot rendered above the spinner (e.g. pulsing Sparkles/ShieldCheck for Vega waits). */
  icon?: ReactNode
  className?: string
}) {
  const labelColor = tone === 'vega' ? 'text-[#7ff2e3]' : 'text-white/55'
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${FILL_CLASS[fill]} ${className}`}
      role="status"
    >
      {icon}
      <PixelSpinner size="lg" tone={TONE_SPINNER[tone]} />
      <span className={`font-pixel text-[9px] uppercase tracking-widest ${labelColor}`}>{label}</span>
      {sublabel && (
        <span className="font-pixel text-[7px] text-white/40 text-center max-w-[260px] normal-case tracking-normal">
          {sublabel}
        </span>
      )}
    </div>
  )
}
