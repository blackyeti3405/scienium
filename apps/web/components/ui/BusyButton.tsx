import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { PixelSpinner } from './PixelSpinner'

/**
 * Normalizes pattern B's spinner-ternary idiom (`{busy ? <SpinnerIcon .../> :
 * <Icon />} {busy ? 'Saving…' : 'Save'}`) into one component, and gives every
 * previously zero-feedback mutation button (deletes, economy actions,
 * branch/promote) the same busy treatment for free.
 *
 * Unstyled-wrapping: `className` passes straight through so this drops into
 * any existing button skin (`ops-submit-btn`, `ops-icon-btn`, etc.) without
 * visual churn. Disables the button and sets `aria-busy` while busy.
 */
export function BusyButton({
  busy,
  busyLabel,
  icon,
  spinnerTone = 'chrome',
  showSpinner = true,
  children,
  className = '',
  disabled,
  ...rest
}: {
  busy: boolean
  /** Gerund shown in place of `children` while busy, e.g. "Saving…". Omit to keep children fixed and only swap the icon. */
  busyLabel?: ReactNode
  /** Icon slot shown when not busy (swapped for a spinner while busy, unless `showSpinner` is false). */
  icon?: ReactNode
  spinnerTone?: 'chrome' | 'gold' | 'vega'
  /** Set false for the "dim only" busy idiom (disable, no spinner/icon swap) — e.g. Add-point, Create. */
  showSpinner?: boolean
  /** Omit for icon-only buttons. */
  children?: ReactNode
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return (
    <button
      type="button"
      disabled={busy || disabled}
      aria-busy={busy}
      className={className}
      {...rest}
    >
      {busy ? (showSpinner ? <PixelSpinner size="xs" tone={spinnerTone} /> : null) : icon}
      {busy && busyLabel !== undefined ? busyLabel : children}
    </button>
  )
}
