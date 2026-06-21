import { FieldDispatchTab } from '@/components/ops/FieldDispatchTab'

export const metadata = { title: 'Field Dispatch · NOVA Lab' }

/**
 * Standalone Field Dispatch route (deep-link / back-compat). The primary surface
 * is the Operations Hub tab; this renders the same tab full-bleed.
 */
export default function FieldDispatchPage() {
  return (
    <div className="min-h-screen bg-[#0d1b2e] text-white flex flex-col">
      <FieldDispatchTab />
    </div>
  )
}
