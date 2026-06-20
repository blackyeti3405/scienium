import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ExpertisePanel } from '@/components/ops/ExpertisePanel'

export const metadata = { title: 'Proof of Expertise' }

/**
 * Standalone deep-link surface for Proof of Expertise. The primary entry point is
 * the Operations Hub tab in the lab scene; this mirrors it for direct navigation
 * (matching the other /daily routes). Outside the lab shell the currency context
 * is absent, so the live StatusStrip bump simply no-ops here.
 */
export default function ProofOfExpertisePage() {
  return (
    <div className="flex h-screen flex-col bg-[#0d1b2e] text-white">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3 shrink-0">
        <Link href="/lab" className="ops-icon-btn" title="Back to lab">
          <ArrowLeft size={14} />
        </Link>
        <span className="font-pixel text-[11px] text-[#F5C518]">🎖 Proof of Expertise</span>
      </header>
      <div className="flex flex-1 min-h-0 justify-center">
        <div className="flex w-full max-w-2xl flex-col min-h-0">
          <ExpertisePanel />
        </div>
      </div>
    </div>
  )
}
