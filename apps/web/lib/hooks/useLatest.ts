'use client'

import { useCallback, useRef } from 'react'

/**
 * Ordering guard for a search box or any effect that refetches while an earlier
 * fetch is still in the air (§0.9 Row C1).
 *
 * A debounce is not an ordering guarantee: two requests 300 ms apart can land
 * out of order, and every one of the app's search surfaces wrote its results
 * unconditionally — so the FIRST query's results could paint over the second's
 * and the student saw answers to something they had already stopped typing.
 * Same shape for the Wikipedia reader's Simple-English toggle.
 *
 * Usage:
 *   const begin = useLatest()
 *   ...
 *   const stale = begin()
 *   const data = await fetchThing()
 *   if (stale()) return          // a newer call has started; drop this one
 *   setResults(data)
 *
 * One counter per hook instance, so it also cancels on unmount-by-abandonment:
 * a stale response simply never writes.
 */
export function useLatest(): () => () => boolean {
  const genRef = useRef(0)
  return useCallback(() => {
    const gen = ++genRef.current
    return () => genRef.current !== gen
  }, [])
}
