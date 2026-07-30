'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** One Arrow press. Big enough to be useful, small enough to aim with. */
const KEY_STEP = 16

/**
 * Drag-to-resize size for a divider-adjacent panel. `axis: 'x'` (default) is a
 * right-anchored side panel (dragging the divider left widens it, col-resize
 * cursor); `axis: 'y'` is a bottom-anchored panel (dragging up grows it,
 * row-resize cursor). Spread `dividerProps` onto the divider element and use
 * `size` as the panel's width/height.
 *
 * `dividerProps` carries the whole divider contract (§0.9 Row B): Pointer
 * Events instead of mouse-only ones, so touch and pen work; `role="separator"`
 * with a live `aria-valuenow`, so the divider is announced at all; and
 * `tabIndex` + Arrow keys, so it can be moved without a pointer of any kind.
 * All of it lives here rather than at the two call sites, which is why both
 * dividers were mouse-only and unlabelled in the first place.
 */
export function useResizablePanel({
  min,
  max,
  initial,
  axis = 'x',
  label = 'Resize panel',
}: {
  min: number
  max: number
  initial: number
  axis?: 'x' | 'y'
  label?: string
}) {
  const [size, setSize] = useState(initial)
  const dragRef = useRef<{ start: number; startSize: number } | null>(null)

  const clamp = useCallback((n: number) => Math.min(max, Math.max(min, n)), [min, max])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      dragRef.current = { start: axis === 'x' ? e.clientX : e.clientY, startSize: size }
      document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'
    },
    [axis, size],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // The divider grows the panel in the direction it is anchored FROM, so
      // the key that grows it is the one that points away from the panel.
      const grow = axis === 'x' ? 'ArrowLeft' : 'ArrowUp'
      const shrink = axis === 'x' ? 'ArrowRight' : 'ArrowDown'
      if (e.key !== grow && e.key !== shrink) return
      e.preventDefault()
      setSize((s) => clamp(s + (e.key === grow ? KEY_STEP : -KEY_STEP)))
    },
    [axis, clamp],
  )

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return
      const current = axis === 'x' ? e.clientX : e.clientY
      const dx = dragRef.current.start - current
      setSize(clamp(dragRef.current.startSize + dx))
    }
    const onUp = () => {
      if (!dragRef.current) return
      dragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }
  }, [axis, clamp])

  return {
    size,
    dividerProps: {
      role: 'separator' as const,
      tabIndex: 0,
      'aria-label': label,
      // A vertical divider separates left/right; that is the `x` drag axis.
      'aria-orientation': (axis === 'x' ? 'vertical' : 'horizontal') as 'vertical' | 'horizontal',
      'aria-valuenow': size,
      'aria-valuemin': min,
      'aria-valuemax': max,
      // Without this a touch drag pans the page instead of moving the divider.
      style: { touchAction: 'none' as const },
      onPointerDown,
      onKeyDown,
    },
  }
}
