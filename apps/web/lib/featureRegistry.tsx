'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import type { GatewayKey } from '@/lib/sprites/manifest'
import { StubFeature } from '@/components/lab/StubFeature'

/**
 * Maps each gateway building to the feature component rendered inside its
 * overlay panel (FeaturePanel). Discovery is the real, fully-built feature and
 * is code-split (it pulls in the Wikipedia reader + tree). The remaining six
 * open a StubFeature placeholder until their internals are built — wiring a real
 * one in later is a single edit here, with no changes to the scene/overlay shell.
 *
 * Keep this as the ONLY place gateway keys map to UI, so the shell stays generic.
 */

const loading = () => (
  <div className="flex h-full items-center justify-center">
    <span className="font-pixel text-[10px] text-muted-foreground">loading…</span>
  </div>
)

const DiscoveryFeature = dynamic(
  () => import('@/components/discovery/DiscoveryFeature').then((m) => m.DiscoveryFeature),
  { ssr: false, loading },
)

export const FEATURE_COMPONENTS: Record<GatewayKey, ComponentType> = {
  discovery: DiscoveryFeature,

  science_fair: () => (
    <StubFeature
      title="Science Fair Hub"
      description="Personalized fair calendar, ISEF rubric & categories, and a forms checklist — your competition reference center, available from day one."
      route="/fair-hub/calendar"
    />
  ),
  literature_review: () => (
    <StubFeature
      title="Literature Review"
      description="Upload and review papers toward the 25-paper gate, search your Literature Library, and watch your Citation Graph grow."
      route="/literature/library"
    />
  ),
  operations_hub: () => (
    <StubFeature
      title="Operations Hub"
      description="Your everyday home base: Field Dispatch, Proof of Expertise, and the Project Log / Failure Log daily pillars."
      route="/daily/dispatch"
    />
  ),
  research_plan: () => (
    <StubFeature
      title="Research Plan"
      description="Define your hypothesis, methodology, variables, and study design before experiments begin."
      route="/research-plan"
    />
  ),
  pvp: () => (
    <StubFeature
      title="Battle Arena"
      description="6v6 turn-based PvP using characters derived from your lab buildings. Two battles a day, leaderboard glory."
      route="/pvp/lobby"
    />
  ),
  showcase: () => (
    <StubFeature
      title="Showcase Wing"
      description="Publish your completed project as a public portfolio — title, abstract, board, video, and report."
      route="/showcase/edit"
    />
  ),
}
