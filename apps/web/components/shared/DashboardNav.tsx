'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import {
  type Phase,
  type LabType,
  type Feature,
  isFeatureUnlocked,
  FEATURE_MIN_PHASE,
  PHASE_INFO,
  LAB_TYPE_LABELS,
} from '@/lib/phase'

// ─── Nav section / item definitions ──────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  /** Pixel-art icon character or short string (rendered in pixel font). */
  icon: string
  feature: Feature
}

// Items are grouped visually. "Always open" items never show a padlock.
const ALWAYS_OPEN: NavItem[] = [
  { href: '/lab',               label: 'Lab Home',   icon: '[L]', feature: 'discovery'  },
  { href: '/discovery',         label: 'Discovery',  icon: '[D]', feature: 'discovery'  },
  { href: '/fair-hub/calendar', label: 'Fair Hub',   icon: '[F]', feature: 'fair_hub'   },
]

const PHASE_GATED: NavItem[] = [
  { href: '/literature/library', label: 'Literature',     icon: '[B]', feature: 'literature'    },
  { href: '/research-plan',      label: 'Research Plan',  icon: '[R]', feature: 'research_plan' },
  { href: '/daily/dispatch',     label: 'Daily',          icon: '[*]', feature: 'daily'          },
  { href: '/pvp/lobby',          label: 'Battle',         icon: '[!]', feature: 'pvp'            },
  { href: '/showcase/edit',      label: 'Showcase',       icon: '[S]', feature: 'showcase'       },
]

// ─── Component ────────────────────────────────────────────────────────────────

interface DashboardNavProps {
  phase: Phase
  labType: LabType | null
}

export function DashboardNav({ phase, labType }: DashboardNavProps) {
  const pathname = usePathname()
  const phaseInfo = PHASE_INFO[phase]

  return (
    <nav className="w-52 shrink-0 border-r bg-card flex flex-col h-screen sticky top-0 overflow-y-auto">
      {/* ── Logo ─────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-4 border-b flex flex-col gap-1">
        <Link
          href="/lab"
          className="font-pixel text-[10px] tracking-tight hover:opacity-80 transition-opacity text-foreground"
        >
          ⚗ NOVA Lab
        </Link>
        {labType && (
          <span className="text-[10px] text-muted-foreground font-pixel">
            {LAB_TYPE_LABELS[labType]}
          </span>
        )}
      </div>

      {/* ── Phase badge ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-b">
        <span
          className={`inline-block font-pixel text-[8px] px-2 py-0.5 rounded ${phaseInfo.color}`}
        >
          {phaseInfo.label}
        </span>
      </div>

      {/* ── Always-open items ─────────────────────────────────────────────────── */}
      <div className="pt-3 px-2 space-y-0.5">
        <SectionLabel>Lab</SectionLabel>
        {ALWAYS_OPEN.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} unlocked />
        ))}
      </div>

      {/* ── Phase-gated items ─────────────────────────────────────────────────── */}
      <div className="pt-3 px-2 space-y-0.5 flex-1">
        <SectionLabel>Sections</SectionLabel>
        {PHASE_GATED.map((item) => {
          const unlocked = isFeatureUnlocked(phase, item.feature)
          return (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              unlocked={unlocked}
              lockedPhase={!unlocked ? FEATURE_MIN_PHASE[item.feature] : undefined}
            />
          )
        })}
      </div>

      {/* ── Account ──────────────────────────────────────────────────────────── */}
      <div className="border-t p-4 flex items-center gap-3">
        <UserButton afterSignOutUrl="/" />
        <span className="text-xs text-muted-foreground truncate">Account</span>
      </div>
    </nav>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-pixel text-[8px] text-muted-foreground/60 px-3 py-1 uppercase tracking-widest">
      {children}
    </div>
  )
}

function NavLink({
  item,
  pathname,
  unlocked,
  lockedPhase,
}: {
  item: NavItem
  pathname: string
  unlocked: boolean
  lockedPhase?: Phase
}) {
  const isActive =
    unlocked &&
    (pathname === item.href || pathname.startsWith(item.href + '/'))

  if (!unlocked) {
    return (
      <div
        className="flex items-center gap-2 rounded px-3 py-2 text-xs opacity-40 cursor-not-allowed"
        title={`Unlocks at phase: ${lockedPhase ? PHASE_INFO[lockedPhase].label : 'later'}`}
        aria-disabled="true"
      >
        {/* Pixel padlock icon */}
        <span className="nav-padlock opacity-60" aria-hidden="true" />
        <span className="text-muted-foreground font-pixel text-[9px] leading-none">
          {item.label}
        </span>
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 rounded px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      <span className="font-pixel text-[9px] leading-none shrink-0">{item.icon}</span>
      <span className="truncate">{item.label}</span>
    </Link>
  )
}
