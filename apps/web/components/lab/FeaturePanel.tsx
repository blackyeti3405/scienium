'use client'

import { useEffect, useRef } from 'react'

/**
 * Overlay shell a gateway building opens into (arch §8.4). Renders the feature
 * over the dimmed, scroll-locked lab scene in the pixel-art frame language:
 * chunky border, pixel-font title bar, a close button, and Escape-to-close. The
 * scene stays visible behind it; closing returns to the scene.
 */
export function FeaturePanel({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  const closeRef = useRef<HTMLButtonElement>(null)

  // Escape closes; lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div
      className="feature-panel__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        // click outside the panel (on the backdrop) closes
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="feature-panel">
        <header className="feature-panel__bar">
          <span className="feature-panel__title font-pixel">{title}</span>
          <button
            ref={closeRef}
            type="button"
            className="feature-panel__close font-pixel"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <div className="feature-panel__body">{children}</div>
      </div>
    </div>
  )
}
