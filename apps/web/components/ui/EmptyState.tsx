import type { ReactNode } from 'react'

/**
 * Shared "nothing here yet" block — the dashed-border pixel placeholder
 * re-typed across ~12 features, as one primitive.
 *
 *   <EmptyState message="No experiments yet" hint="Create one to start logging data." />
 *
 * Keep it for genuine empties only: a failed fetch should render an error +
 * retry, never this (see the load-error work in the refactor plan, BLK-7).
 */
export interface EmptyStateProps {
  /** Optional leading glyph/emoji/icon node rendered above the message. */
  icon?: ReactNode
  message: string
  /** Secondary line in body type below the pixel-font message. */
  hint?: string
  /** Dashed border on by default; disable when the parent supplies chrome. */
  bordered?: boolean
  testId?: string
}

export function EmptyState({ icon, message, hint, bordered = true, testId }: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      className={`py-10 text-center ${bordered ? 'border border-dashed border-white/15 rounded-sm' : ''}`}
    >
      {icon && <div className="mb-2 text-base text-white/40">{icon}</div>}
      <p className="font-pixel text-[9px] text-white/40">{message}</p>
      {hint && <p className="mt-2 text-[12px] leading-relaxed text-white/35">{hint}</p>}
    </div>
  )
}
