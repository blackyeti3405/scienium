'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import type { GatewayKey } from '@/lib/sprites/manifest'
import { StubFeature } from '@/components/lab/StubFeature'
import { HubPanelSkeleton } from '@/components/ui/skeletons/HubPanelSkeleton'

/**
 * Maps each gateway building to the feature component rendered inside its
 * overlay panel. PvP remains the only intentionally unfinished surface.
 *
 * Keep this as the ONLY place gateway keys map to UI, so the shell stays generic.
 */

const loading = () => <HubPanelSkeleton />

const DiscoveryFeature = dynamic(
  () => import('@/components/discovery/DiscoveryFeature').then((m) => m.DiscoveryFeature),
  { ssr: false, loading },
)

const LiteratureFeature = dynamic(
  () => import('@/components/literature/LiteratureFeature').then((m) => m.LiteratureFeature),
  { ssr: false, loading },
)

const ScienceFairFeature = dynamic(
  () => import('@/components/fair/ScienceFairFeature').then((m) => m.ScienceFairFeature),
  { ssr: false, loading },
)

const ResearchPlanFeature = dynamic(
  () => import('@/components/research-plan/ResearchPlanFeature').then((m) => m.ResearchPlanFeature),
  { ssr: false, loading },
)

const OperationsHubFeature = dynamic(
  () => import('@/components/ops/OperationsHubFeature').then((m) => m.OperationsHubFeature),
  { ssr: false, loading },
)

const ShowcaseEditor = dynamic(
  () => import('@/components/showcase/ShowcaseEditor').then((m) => m.ShowcaseEditor),
  { ssr: false, loading },
)

export const FEATURE_COMPONENTS: Record<GatewayKey, ComponentType> = {
  discovery: DiscoveryFeature,

  science_fair: ScienceFairFeature,
  literature_review: LiteratureFeature,
  operations_hub: OperationsHubFeature,
  research_plan: ResearchPlanFeature,
  pvp: () => (
    <StubFeature
      title="Battle Arena"
      description="Raid another lab with spells unlocked by your buildings."
      route="/pvp/lobby"
    />
  ),
  showcase: ShowcaseEditor,
}
