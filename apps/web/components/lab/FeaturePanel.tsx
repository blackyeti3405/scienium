'use client'

import { useRef } from 'react'
import { ModalBackdrop } from '@/components/ui/ModalBackdrop'

/**
 * Overlay shell a gateway building opens into (arch §8.4). Renders the feature
 * over the dimmed, scroll-locked lab scene in the pixel-art frame language:
 * chunky border, pixel-font title bar, a close button, and Escape-to-close.
 * Focus is trapped inside and restored to the trigger on close (useModalA11y).
 * The scene stays visible behind it; closing returns to the scene.
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

  return (
    <ModalBackdrop label={title} onClose={onClose} initialFocusRef={closeRef}>
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
    </ModalBackdrop>
  )
}
