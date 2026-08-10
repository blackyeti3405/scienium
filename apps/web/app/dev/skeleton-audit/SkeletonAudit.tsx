'use client'

import { DiscoveryPanelSkeleton } from '@/components/ui/skeletons/DiscoveryPanelSkeleton'
import { OpsHubPanelSkeleton } from '@/components/ui/skeletons/OpsHubPanelSkeleton'
import {
  FairPanelSkeleton,
  LiteraturePanelSkeleton,
  PvpPanelSkeleton,
  ResearchPlanPanelSkeleton,
  ShowcasePanelSkeleton,
} from '@/components/ui/skeletons/PanelSkeletons'
import { OperationsHubFeature } from '@/components/ops/OperationsHubFeature'
import { ScienceFairFeature } from '@/components/fair/ScienceFairFeature'
import { LiteratureFeature } from '@/components/literature/LiteratureFeature'
import { ResearchPlanFeature } from '@/components/research-plan/ResearchPlanFeature'
import { PvpFeature } from '@/components/pvp/PvpFeature'
import { ShowcaseEditor } from '@/components/showcase/ShowcaseEditor'
import { UnlockCeremony } from '@/components/lab/UnlockCeremony'
import { MarketingNav, MarketingFooter } from '@/components/marketing/MarketingChrome'
import { DiscoveryHome } from '@/components/discovery/DiscoveryHome'

/**
 * Discovery's home screen is presentational — it takes everything as props — so
 * it CAN be rendered here with a new-lab shape (no final topic, no starred
 * nodes, no interests). That is exactly the state its skeleton stands in for.
 */
const noop = () => {}
const discoveryHomeProps = {
  starredNodes: [] as never[],
  hasExisting: false,
  finalTopic: null,
  editingTopic: false,
  topicDraft: '',
  onDraftChange: noop,
  onBeginEdit: noop,
  onSave: noop,
  onCancelEdit: noop,
  onContinue: noop,
  onOpenStarred: noop,
  interests: [] as never[],
  currentUserId: null,
  onAddInterest: noop,
  onRemoveInterest: noop,
  onSeedInterest: noop,
}

/**
 * One row: the skeleton and the real panel in identical boxes, each tagged so a
 * measuring script can pull both and diff their geometry.
 */
function Pair({ id, label, skeleton, real }: { id: string; label: string; skeleton: React.ReactNode; real: React.ReactNode }) {
  return (
    <section data-pair={id} className="mb-10">
      <h2 style={{ color: '#F5C518', font: '12px monospace', marginBottom: 8 }}>{label}</h2>
      <div style={{ display: 'flex', gap: 16 }}>
        <div data-audit="skeleton" style={{ width: 620, height: 760, border: '1px solid #333', overflow: 'hidden' }}>
          {skeleton}
        </div>
        <div data-audit="real" style={{ width: 620, height: 760, border: '1px solid #333', overflow: 'hidden' }}>
          {real}
        </div>
      </div>
    </section>
  )
}

export function SkeletonAudit() {
  return (
    <div style={{ background: '#0d1b2e', minHeight: '100vh', padding: 24 }}>
      <section data-pair="nav" className="mb-10">
        <h2 style={{ color: '#F5C518', font: '12px monospace', marginBottom: 8 }}>
          MARKETING NAV — signed out (top) vs signed in (bottom)
        </h2>
        <div data-nav="signedout"><MarketingNav userId={null} /></div>
        <div data-nav="signedin" style={{ marginTop: 12 }}>
          <MarketingNav userId="dev_preview_user" launchHref="/lab" />
        </div>
        <div data-nav="footer-signedin" style={{ marginTop: 12 }}>
          <MarketingFooter userId="dev_preview_user" launchHref="/lab" />
        </div>
      </section>

      <section data-pair="ceremony" className="mb-10">
        <h2 style={{ color: '#F5C518', font: '12px monospace', marginBottom: 8 }}>
          UNLOCK CEREMONY (over a mock lab)
        </h2>
        <div
          className="lab-scene lab-scene--unlocking"
          style={{ position: 'relative', width: 800, height: 420, border: '1px solid #333' }}
        >
          <div style={{ position: 'absolute', inset: 0, background: '#4a7c3e' }} />
          <button className="shop-button font-pixel" type="button">
            <span className="shop-button__label">SHOP</span>
          </button>
          <UnlockCeremony count={1} />
        </div>
      </section>

      <Pair id="ops" label="OPERATIONS HUB" skeleton={<OpsHubPanelSkeleton />} real={<OperationsHubFeature phase="discovery" />} />
      <Pair id="fair" label="SCIENCE FAIR" skeleton={<FairPanelSkeleton />} real={<ScienceFairFeature />} />
      <Pair id="lit" label="LITERATURE REVIEW" skeleton={<LiteraturePanelSkeleton />} real={<LiteratureFeature />} />
      <Pair id="plan" label="RESEARCH PLAN" skeleton={<ResearchPlanPanelSkeleton />} real={<ResearchPlanFeature />} />
      <Pair id="pvp" label="BATTLE ARENA" skeleton={<PvpPanelSkeleton />} real={<PvpFeature />} />
      <Pair
        id="discovery"
        label="DISCOVERY"
        skeleton={<DiscoveryPanelSkeleton />}
        real={
          <div className="flex flex-col h-full bg-[#0d1b2e]">
            <header className="flex items-center gap-3 border-b border-white/10 px-6 py-4 shrink-0">
              <span className="font-pixel text-[10px] text-white">🔭 Discovery</span>
            </header>
            <DiscoveryHome {...discoveryHomeProps} />
          </div>
        }
      />
      <Pair id="showcase" label="SHOWCASE" skeleton={<ShowcasePanelSkeleton />} real={<ShowcaseEditor />} />
    </div>
  )
}
