'use client'

import Link from 'next/link'
import { Sprite } from '@/components/lab/Sprite'
import { LAB_SPRITES, UI_SPRITES, getLabSpriteKey } from '@/lib/sprites/manifest'
import {
  type Phase,
  type LabType,
  type Feature,
  getLabSize,
  isFeatureUnlocked,
  PHASE_INFO,
  PHASE_ORDER,
  LAB_TYPE_LABELS,
} from '@/lib/phase'

// ─── Wing definition ──────────────────────────────────────────────────────────

interface LabWing {
  id: string
  label: string
  href: string
  feature: Feature
  /** Short description shown on hover / below the wing tile. */
  hint: string
}

const WINGS: LabWing[] = [
  { id: 'discovery',  label: 'Discovery Wing',      href: '/discovery',       feature: 'discovery',     hint: 'Explore topics & Wikipedia' },
  { id: 'lit',        label: 'Literature Wing',      href: '/literature/library', feature: 'literature', hint: 'Papers, library & citation graph' },
  { id: 'research',   label: 'Research Plan',        href: '/research-plan',   feature: 'research_plan', hint: 'Design your study' },
  { id: 'daily',      label: 'Operations Wing',      href: '/daily/dispatch',  feature: 'daily',         hint: 'Daily activities & project log' },
  { id: 'buildings',  label: 'Equipment Bay',        href: '/lab/buildings',   feature: 'buildings',     hint: 'Buy & upgrade lab equipment' },
  { id: 'pvp',        label: 'Battle Arena',         href: '/pvp/lobby',       feature: 'pvp',           hint: 'PvP combat with your characters' },
  { id: 'fair',       label: 'Fair Hub',             href: '/fair-hub/calendar', feature: 'fair_hub',   hint: 'Fair dates, rubric & forms' },
  { id: 'showcase',   label: 'Showcase Wing',        href: '/showcase/edit',   feature: 'showcase',      hint: 'Publish your research' },
]

// ─── Component ────────────────────────────────────────────────────────────────

interface LabCanvasProps {
  phase: Phase
  labType: LabType | null
  teamName?: string
}

export function LabCanvas({ phase, labType, teamName }: LabCanvasProps) {
  const size = getLabSize(phase)
  const spriteKey = getLabSpriteKey(labType, size)
  const spriteEntry = LAB_SPRITES[spriteKey]
  const phaseInfo = PHASE_INFO[phase]

  const labLabel = labType ? LAB_TYPE_LABELS[labType] : 'Generic Lab'

  return (
    <div className="lab-canvas select-none">
      {/* ── Header bar ─────────────────────────────────────────────── */}
      <div className="lab-canvas__header">
        <div className="lab-canvas__header-left">
          <span className="font-pixel text-xs text-white/80">
            {teamName ?? 'Your Lab'}
          </span>
          {labType && (
            <span className="font-pixel text-[10px] text-white/50 ml-2">
              [{labLabel}]
            </span>
          )}
        </div>
        <span
          className="font-pixel text-[10px] px-2 py-0.5 rounded"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: '#ffe566' }}
        >
          {phaseInfo.label.toUpperCase()}
        </span>
      </div>

      {/* ── Lab building sprite ─────────────────────────────────────── */}
      <div className="lab-canvas__building">
        <Sprite entry={spriteEntry} />
        <div className="lab-canvas__building-label font-pixel">
          {size === 'small' ? '[ SMALL LAB ]' : `[ ${labLabel.toUpperCase()} ]`}
        </div>
        {size === 'small' && (
          <p className="lab-canvas__small-hint font-pixel">
            Select a lab type to grow your lab
          </p>
        )}
      </div>

      {/* ── Wings grid ──────────────────────────────────────────────── */}
      <div className="lab-canvas__wings">
        {WINGS.map((wing) => {
          const unlocked = isFeatureUnlocked(phase, wing.feature)
          return (
            <WingTile key={wing.id} wing={wing} unlocked={unlocked} />
          )
        })}
      </div>

      {/* ── Phase progress dots ─────────────────────────────────────── */}
      <PhaseDots current={phase} />
    </div>
  )
}

// ─── Wing tile ────────────────────────────────────────────────────────────────

function WingTile({ wing, unlocked }: { wing: LabWing; unlocked: boolean }) {
  const padlock = UI_SPRITES.padlock_closed

  const inner = (
    <div
      className={`lab-wing-tile ${unlocked ? 'lab-wing-tile--open' : 'lab-wing-tile--locked'}`}
      title={unlocked ? wing.hint : `Locked — complete earlier phases to unlock`}
    >
      {!unlocked && (
        <Sprite
          entry={padlock}
          scale={1}
          className="lab-wing-tile__padlock"
        />
      )}
      <span className="font-pixel lab-wing-tile__label">{wing.label}</span>
      {unlocked && (
        <span className="lab-wing-tile__hint">{wing.hint}</span>
      )}
    </div>
  )

  if (!unlocked) {
    return <div aria-disabled className="cursor-not-allowed">{inner}</div>
  }

  return <Link href={wing.href}>{inner}</Link>
}

// ─── Phase progress dots ──────────────────────────────────────────────────────

function PhaseDots({ current }: { current: Phase }) {
  const currentIdx = PHASE_ORDER.indexOf(current)

  return (
    <div className="lab-canvas__phase-dots">
      {PHASE_ORDER.map((p, i) => (
        <div
          key={p}
          className={`lab-canvas__phase-dot ${
            i < currentIdx
              ? 'lab-canvas__phase-dot--done'
              : i === currentIdx
              ? 'lab-canvas__phase-dot--current'
              : 'lab-canvas__phase-dot--future'
          }`}
          title={PHASE_INFO[p].label}
        />
      ))}
    </div>
  )
}
