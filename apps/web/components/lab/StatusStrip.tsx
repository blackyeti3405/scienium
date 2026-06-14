'use client'

import { UserButton } from '@clerk/nextjs'
import { PHASE_INFO, LAB_TYPE_LABELS, type Phase, type LabType } from '@/lib/phase'

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
}: {
  teamName: string
  phase: Phase
  labType: LabType | null
  currency: Currency
}) {
  const phaseInfo = PHASE_INFO[phase]

  return (
    <div className="status-strip">
      <div className="status-strip__left">
        <span className="font-pixel status-strip__brand">⚗ NOVA Lab</span>
        <span className="status-strip__team">{teamName}</span>
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
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
  )
}

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
  return (
    <span className="font-pixel status-strip__stat" title={title}>
      <span style={{ color }}>{label}</span>
      <span className="status-strip__stat-value">{value}</span>
    </span>
  )
}
