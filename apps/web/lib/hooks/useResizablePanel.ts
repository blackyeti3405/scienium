'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Drag-to-resize size for a divider-adjacent panel. `axis: 'x'` (default) is a
 * right-anchored side panel (dragging the divider left widens it, col-resize
 * cursor); `axis: 'y'` is a bottom-anchored panel (dragging up grows it,
 * row-resize cursor). Attach `onDividerMouseDown` to the divider element and
 * `size` to the panel's width/height.
 */
export function useResizablePanel({
  min,
  max,
  initial,
  axis = 'x',
}: {
  min: number
  max: number
  initial: number
  axis?: 'x' | 'y'
}) {
  const [size, setSize] = useState(initial)
  const dragRef = useRef<{ start: number; startSize: number } | null>(null)

  const onDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragRef.current = { start: axis === 'x' ? e.clientX : e.clientY, startSize: size }
      document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'
    },
    [axis, size],
  )

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const current = axis === 'x' ? e.clientX : e.clientY
      const dx = dragRef.current.start - current
      setSize(Math.min(max, Math.max(min, dragRef.current.startSize + dx)))
    }
    const onUp = () => {
      if (!dragRef.current) return
      dragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [axis, min, max])

  return { size, onDividerMouseDown }
}
