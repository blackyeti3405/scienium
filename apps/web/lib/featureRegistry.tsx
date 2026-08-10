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

import { DiscoveryPanelSkeleton } from '@/components/ui/skeletons/DiscoveryPanelSkeleton'
import { OpsHubPanelSkeleton } from '@/components/ui/skeletons/OpsHubPanelSkeleton'
import {
  FairPanelSkeleton,
  LiteraturePanelSkeleton,
  PvpPanelSkeleton,
  ResearchPlanPanelSkeleton,
  ShowcasePanelSkeleton,
} from '@/components/ui/skeletons/PanelSkeletons'

/**
 * Maps each gateway building to the feature component rendered inside its
 * overlay panel. All seven gateways are now wired to real features.
 *
 * Keep this as the ONLY place gateway keys map to UI, so the shell stays generic.
 */

/**
 * Each gateway gets the skeleton that matches ITS panel. These all used to share
 * one `HubPanelSkeleton` — a 4-pill tab strip over three centred boxes — which
 * described none of them: Discovery has no tab strip at all, and the Operations
 * Hub's strip is a full-width bordered bar, not pills. The generic one now only
 * serves the panels that genuinely are "header + stacked blocks".
 */
const loadingDiscovery = () => <DiscoveryPanelSkeleton />
const loadingOpsHub = () => <OpsHubPanelSkeleton />
const loadingFair = () => <FairPanelSkeleton />
const loadingLiterature = () => <LiteraturePanelSkeleton />
const loadingResearchPlan = () => <ResearchPlanPanelSkeleton />
const loadingPvp = () => <PvpPanelSkeleton />
const loadingShowcase = () => <ShowcasePanelSkeleton />

const DiscoveryFeature = dynamic<GatewayFeatureProps>(
  () => import('@/components/discovery/DiscoveryFeature').then((m) => m.DiscoveryFeature),
  { ssr: false, loading: loadingDiscovery },
)

const LiteratureFeature = dynamic<GatewayFeatureProps>(
  () => import('@/components/literature/LiteratureFeature').then((m) => m.LiteratureFeature),
  { ssr: false, loading: loadingLiterature },
)

const ScienceFairFeature = dynamic<GatewayFeatureProps>(
  () => import('@/components/fair/ScienceFairFeature').then((m) => m.ScienceFairFeature),
  { ssr: false, loading: loadingFair },
)

const ResearchPlanFeature = dynamic<GatewayFeatureProps>(
  () => import('@/components/research-plan/ResearchPlanFeature').then((m) => m.ResearchPlanFeature),
  { ssr: false, loading: loadingResearchPlan },
)

const OperationsHubFeature = dynamic<GatewayFeatureProps>(
  () => import('@/components/ops/OperationsHubFeature').then((m) => m.OperationsHubFeature),
  { ssr: false, loading: loadingOpsHub },
)

const ShowcaseEditor = dynamic<GatewayFeatureProps>(
  () => import('@/components/showcase/ShowcaseEditor').then((m) => m.ShowcaseEditor),
  { ssr: false, loading: loadingShowcase },
)

const PvpFeature = dynamic<GatewayFeatureProps>(
  () => import('@/components/pvp/PvpFeature').then((m) => m.PvpFeature),
  { ssr: false, loading: loadingPvp },
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
