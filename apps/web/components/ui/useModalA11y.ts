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
 *
 * ## Why there is a stack (§0.9 Row A)
 *
 * Every instance listens on `document`, in the same phase. `stopPropagation`
 * does NOT stop a sibling listener on the SAME node — only
 * `stopImmediatePropagation` would, and that is registration-order dependent,
 * which is mount order, which is not intent. So one Escape used to fire
 * `onClose` on EVERY open dialog: a student who opened Literature Review → a
 * delete confirm and pressed Escape lost the whole feature panel too.
 *
 * The stack is the intent the DOM doesn't carry: only the dialog opened LAST
 * handles the key. It also gates the Tab trap, so the outer dialog stops
 * fighting the inner one for focus while the inner one is up.
 */

/**
 * Open dialogs, oldest first. Module-level on purpose: the ordering is a
 * property of the PAGE, not of any one component, and every dialog shell in
 * the app routes through this hook. Exported for `test/modal-stack.test.ts`.
 */
const openModals: symbol[] = []

export function pushModal(token: symbol): void {
  openModals.push(token)
}

export function popModal(token: symbol): void {
  const i = openModals.lastIndexOf(token)
  if (i !== -1) openModals.splice(i, 1)
}

/** True only for the most recently opened dialog still mounted. */
export function isTopModal(token: symbol): boolean {
  return openModals.length > 0 && openModals[openModals.length - 1] === token
}

/** Test-only: drop every registration so one test can't leak into the next. */
export function __resetModalStack(): void {
  openModals.length = 0
}

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
    const token = Symbol('modal')
    pushModal(token)

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
      // Only the topmost dialog reacts. See the stack note above.
      if (!isTopModal(token)) return
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
      popModal(token)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus?.()
    }
  }, [open])

  return containerRef
}
