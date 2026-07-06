'use client'

import { useCallback, useState } from 'react'

/**
 * Expand/collapse (or check/uncheck) state as an immutable `Set` with a
 * delete-if-present-else-add toggle — the idiom every guide panel and
 * checklist was hand-rolling. Returns stable `toggle` and `reset` (collapse
 * everything — e.g. the Charts Guide clears expansion when its field
 * changes) callbacks so they can be passed to memoized children.
 */
export function useToggleSet<T>(initial?: Iterable<T>): [Set<T>, (key: T) => void, () => void] {
  const [set, setSet] = useState<Set<T>>(() => new Set(initial))
  const toggle = useCallback((key: T) => {
    setSet((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])
  const reset = useCallback(() => setSet(new Set()), [])
  return [set, toggle, reset]
}
