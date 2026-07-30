'use client'

import { useEffect } from 'react'

/**
 * Clears a transient notice after a delay — the `setTimeout(() => setX(null))`
 * idiom repeated across ~20 features, with the cleanup those copies usually
 * forget (a leaked timer clearing a *future* notice early, or firing after
 * unmount).
 *
 *   const [notice, setNotice] = useState<Notice | null>(null)
 *   useAutoDismiss(notice, () => setNotice(null))
 *
 * The timer restarts whenever `value` changes to a new truthy reference, so
 * back-to-back notices each get the full duration.
 */
export function useAutoDismiss(value: unknown, dismiss: () => void, ms = 4000): void {
  useEffect(() => {
    if (!value) return
    const timer = setTimeout(dismiss, ms)
    return () => clearTimeout(timer)
    // `dismiss` is deliberately omitted: callers pass inline closures, and
    // re-arming on every render would keep pushing the deadline back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ms])
}
