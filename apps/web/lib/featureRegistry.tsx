'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import type { GatewayKey } from '@/lib/sprites/manifest'
import type { Phase } from '@/lib/phase'

/**
 * Props every gateway feature is rendered with. Only the Operations Hub reads
 * `phase` today (it decides which of its tabs are unlocked); the rest declare no
 * props at all, which TypeScript accepts — a component may ignore what it is
 * handed. Passing it uniformly beats special-casing one gateway at the call site.
 */
export interface GatewayFeatureProps {
  phase: Phase
}

import { HubPanelSkeleton } from '@/components/ui/skeletons/HubPanelSkeleton'

/**
 * Maps each gateway building to the feature component rendered inside its
 * overlay panel. All seven gateways are now wired to real features.
 *
 * Keep this as the ONLY place gateway keys map to UI, so the shell stays generic.
 */

const loading = () => <HubPanelSkeleton />

const DiscoveryFeature = dynamic<GatewayFeatureProps>(
  () => import('@/components/discovery/DiscoveryFeature').then((m) => m.DiscoveryFeature),
  { ssr: false, loading },
)

const LiteratureFeature = dynamic<GatewayFeatureProps>(
  () => import('@/components/literature/LiteratureFeature').then((m) => m.LiteratureFeature),
  { ssr: false, loading },
)

const ScienceFairFeature = dynamic<GatewayFeatureProps>(
  () => import('@/components/fair/ScienceFairFeature').then((m) => m.ScienceFairFeature),
  { ssr: false, loading },
)

const ResearchPlanFeature = dynamic<GatewayFeatureProps>(
  () => import('@/components/research-plan/ResearchPlanFeature').then((m) => m.ResearchPlanFeature),
  { ssr: false, loading },
)

const OperationsHubFeature = dynamic<GatewayFeatureProps>(
  () => import('@/components/ops/OperationsHubFeature').then((m) => m.OperationsHubFeature),
  { ssr: false, loading },
)

const ShowcaseEditor = dynamic<GatewayFeatureProps>(
  () => import('@/components/showcase/ShowcaseEditor').then((m) => m.ShowcaseEditor),
  { ssr: false, loading },
)

const PvpFeature = dynamic<GatewayFeatureProps>(
  () => import('@/components/pvp/PvpFeature').then((m) => m.PvpFeature),
  { ssr: false, loading },
)

export const FEATURE_COMPONENTS: Record<GatewayKey, ComponentType<GatewayFeatureProps>> = {
  discovery: DiscoveryFeature,

  science_fair: ScienceFairFeature,
  literature_review: LiteratureFeature,
  operations_hub: OperationsHubFeature,
  research_plan: ResearchPlanFeature,
  pvp: PvpFeature,
  showcase: ShowcaseEditor,
}
