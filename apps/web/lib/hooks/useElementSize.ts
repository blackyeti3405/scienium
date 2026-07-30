'use client'

import { useEffect, useState, type RefObject } from 'react'

/**
 * Measures an element's content box on mount and keeps it in sync via
 * ResizeObserver — the "measure a container so its children can lay out
 * against real pixel dimensions" idiom shared by DecorationLayer, LabPlot,
 * and TileBackground.
 */
export function useElementSize(ref: RefObject<HTMLElement | null>): { w: number; h: number } {
  const [dims, setDims] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setDims({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return dims
}
