'use client'

import { useEffect, useRef, useState } from 'react'
import { UserButton } from '@clerk/nextjs'
import { FlaskConical, Settings } from 'lucide-react'
import { PHASE_INFO, LAB_TYPE_LABELS, type Phase, type LabType } from '@/lib/phase'
import { NotificationBell } from './NotificationBell'
import { LabProfileSettings } from '@/components/settings/LabProfileSettings'

export interface Currency {
  kp: number
  clearanceLevel: number
  lc: number
}

/**
 * The only persistent chrome in the spatial shell: a slim pixel-framed strip
 * showing team identity, phase, and the three currencies (spec §8). No feature
 * navigation lives here — buildings are the navigation.
 */
export function StatusStrip({
  teamName,
  phase,
  labType,
  currency,
  onOpenTeam,
  onOpenSettings,
}: {
  teamName: string
  phase: Phase
  labType: LabType | null
  currency: Currency
  /** Opens the Team panel (roster + invite codes). */
  onOpenTeam?: () => void
  /** Opens the Settings popup (profile, lab, topic, research plan). */
  onOpenSettings?: () => void
}) {
  const phaseInfo = PHASE_INFO[phase]

  return (
    <div className="status-strip">
      <div className="status-strip__left">
        <span className="font-pixel status-strip__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nova-lab-logo.png" alt="" width={24} height={24} className="pixel-art" />
          NOVA Lab
        </span>
        {onOpenTeam ? (
          <button
            type="button"
            className="status-strip__team status-strip__team--button"
            onClick={onOpenTeam}
            title="View your lab roster & invite members"
          >
            {teamName}
          </button>
        ) : (
          <span className="status-strip__team">{teamName}</span>
        )}
        {labType && (
          <span className="font-pixel status-strip__labtype">{LAB_TYPE_LABELS[labType]}</span>
        )}
      </div>

      <div className="status-strip__right">
        <Stat label="KP" value={currency.kp} title="Knowledge Points" color="#ffe566" />
        <Stat label="CLR" value={currency.clearanceLevel} title="Clearance Level" color="#7ff2e3" />
        <Stat label="LC" value={currency.lc} title="Lab Credits" color="#ffb24d" />
        <span className="font-pixel status-strip__phase" title={phaseInfo.description}>
          {phaseInfo.label.toUpperCase()}
        </span>
        <NotificationBell />
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            title="Settings — edit your profile, lab, topic & research plan"
            aria-label="Settings"
            className="text-white/50 hover:text-[#F5C518] transition-colors flex items-center"
          >
            <Settings size={16} />
          </button>
        )}
        <UserButton afterSignOutUrl="/">
          {/* A custom page must be a DIRECT child of <UserButton> — Clerk ignores
              wrapper components, so the page slot is inlined here, not abstracted. */}
          <UserButton.UserProfilePage
            label="Lab & Profile"
            labelIcon={<FlaskConical size={14} />}
            url="lab-profile"
          >
            <LabProfileSettings />
          </UserButton.UserProfilePage>
        </UserButton>
      </div>
    </div>
  )
}

/**
 * A single currency readout. When the value increases it celebrates the gain:
 * the number ticks up from the old value to the new, while the whole stat turns
 * green and balloons, then contracts back to its normal size and colour. A
 * decrease (or the first render) just snaps to the value with no animation.
 */
function Stat({
  label,
  value,
  title,
  color,
}: {
  label: string
  value: number
  title: string
  color: string
}) {
  const [display, setDisplay] = useState(value)
  const [bumping, setBumping] = useState(false)
  const prevRef = useRef(value)

  useEffect(() => {
    const from = prevRef.current
    prevRef.current = value
    if (value <= from) {
      setDisplay(value)
      return
    }

    // Count up from the old balance to the new one, then hold the balloon a beat
    // before contracting back (the CSS transition handles grow/shrink + colour).
    setBumping(true)
    const duration = 700
    const start = performance.now()
    let raf = 0
    let holdTimer = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setDisplay(Math.round(from + (value - from) * eased))
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        setDisplay(value)
        holdTimer = window.setTimeout(() => setBumping(false), 200)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(holdTimer)
    }
  }, [value])

  return (
    <span
      className={`font-pixel status-strip__stat${bumping ? ' status-strip__stat--bump' : ''}`}
      title={title}
    >
      <span style={bumping ? undefined : { color }}>{label}</span>
      <span className="status-strip__stat-value">{display.toLocaleString()}</span>
    </span>
  )
}
