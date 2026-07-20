'use client'

import { useEffect, useRef } from 'react'

/**
 * Shared modal-dialog behavior (A9): focus trap, focus restore, Escape-to-
 * close, and body scroll lock — the four things every dialog shell in the app
 * was implementing (differently, and none with a trap or restore).
 *
 * Attach the returned ref to the dialog's outermost element (the backdrop is
 * fine). While open:
 *   - initial focus goes to `initialFocusRef` (or the first focusable);
 *   - Tab / Shift+Tab cycle INSIDE the dialog — keyboard users can no longer
 *     tab out into the inert page behind it;
 *   - Escape calls `onClose`;
 *   - body scroll is locked.
 * On close/unmount, focus returns to whatever had it before the dialog opened
 * (the trigger button), so keyboard users aren't dumped at the top of the page.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function useModalA11y(options: {
  /** Panels that mount only while open can omit this (defaults to true). */
  open?: boolean
  onClose: () => void
  initialFocusRef?: React.RefObject<HTMLElement | null>
}): React.RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement>(null)
  const open = options.open ?? true

  // Callers pass inline closures; keep them out of the effect deps so a parent
  // re-render can't tear down and re-run the trap (which would yank focus).
  const onCloseRef = useRef(options.onClose)
  onCloseRef.current = options.onClose
  const initialFocusRef = useRef(options.initialFocusRef)
  initialFocusRef.current = options.initialFocusRef

  useEffect(() => {
    if (!open) return
    const container = containerRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusables = () =>
      container
        ? [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
            (el) => el.offsetParent !== null || el === document.activeElement,
          )
        : []

    ;(initialFocusRef.current?.current ?? focusables()[0])?.focus()

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !container) return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]!
      const last = items[items.length - 1]!
      const active = document.activeElement as HTMLElement | null
      if (!active || !container.contains(active)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus?.()
    }
  }, [open])

  return containerRef
}
