'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Drag-to-resize width for a right-anchored side panel (dragging the divider
 * left widens the panel). Extracted verbatim from `DiscoveryFeature`; attach
 * `onDividerMouseDown` to the divider element and `width` to the panel.
 */
export function useResizablePanel({
  min,
  max,
  initial,
}: {
  min: number
  max: number
  initial: number
}) {
  const [width, setWidth] = useState(initial)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const onDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragRef.current = { startX: e.clientX, startWidth: width }
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [width],
  )

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const dx = dragRef.current.startX - e.clientX
      setWidth(Math.min(max, Math.max(min, dragRef.current.startWidth + dx)))
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
  }, [min, max])

  return { width, onDividerMouseDown }
}
