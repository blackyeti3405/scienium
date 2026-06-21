'use client'

import { useEffect, useRef } from 'react'
import { Settings, X } from 'lucide-react'
import { LabProfileSettings } from './LabProfileSettings'

/**
 * Settings modal — opened from the gear button in the status strip. A dark
 * pixel-framed popup (mirrors TeamPanel's chrome) wrapping the same
 * LabProfileSettings form that also backs the Clerk "Lab & Profile" account page,
 * so there is a single source of truth for the settings UI.
 */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

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
      aria-label="Settings"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex flex-col w-[min(440px,94vw)] max-h-[85vh] bg-[#0d1b2e] text-white border-[3px] border-[#2a3048] rounded-[4px] overflow-hidden shadow-[0_0_0_3px_#10131f,0_18px_60px_rgba(0,0,0,0.6)]">
        <header className="flex items-center justify-between px-4 py-3 border-b-[3px] border-[#2a3048] bg-[#0f1320] shrink-0">
          <span className="font-pixel text-[10px] text-[#e8ecfb] flex items-center gap-2">
            <Settings size={12} className="text-[#F5C518]" /> Settings
          </span>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="text-white/40 hover:text-white/70 transition-colors"
          >
            <X size={14} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <LabProfileSettings />
        </div>
      </div>
    </div>
  )
}
