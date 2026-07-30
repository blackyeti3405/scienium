'use client'

import { useModalA11y } from '@/components/ui/useModalA11y'

/**
 * Shared modal backdrop shell (A9 follow-up): the containerRef/useModalA11y
 * wiring, the `role="dialog"` + `aria-modal` + `aria-label` attributes, and
 * click-outside-closes behavior that FeaturePanel, FeedbackPanel, TeamPanel,
 * SettingsPanel, and ShopPanel were each implementing near-verbatim. Callers
 * render their own inner panel markup as children and pass their own close
 * button's ref as `initialFocusRef` so focus still lands there on open.
 */
export function ModalBackdrop({
  label,
  onClose,
  initialFocusRef,
  className = 'feature-panel__backdrop',
  children,
}: {
  label: string
  onClose: () => void
  initialFocusRef?: React.RefObject<HTMLElement | null>
  className?: string
  children: React.ReactNode
}) {
  const containerRef = useModalA11y({ onClose, initialFocusRef })

  return (
    <div
      ref={containerRef}
      className={className}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(e) => {
        // click outside the panel (on the backdrop) closes
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {children}
    </div>
  )
}
