import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ShowcaseEditor } from '@/components/showcase/ShowcaseEditor'

export const metadata = { title: 'Edit Showcase' }

/**
 * Standalone deep-link surface for the Showcase editor. The primary entry point
 * is the Showcase gateway in the lab scene; this mirrors it for direct navigation.
 */
export default function ShowcaseEditPage() {
  return (
    <div className="flex h-screen flex-col bg-[#0d1b2e] text-white">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3 shrink-0">
        <Link href="/lab" className="ops-icon-btn" title="Back to lab">
          <ArrowLeft size={14} />
        </Link>
        <span className="font-pixel text-[11px] text-[#F5C518]">🏛 Showcase Wing</span>
      </header>
      <div className="flex flex-1 min-h-0 justify-center">
        <div className="flex w-full max-w-3xl flex-col min-h-0">
          <ShowcaseEditor />
        </div>
      </div>
    </div>
  )
}
