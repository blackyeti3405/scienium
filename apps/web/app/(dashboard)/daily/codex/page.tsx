import { CodexTab } from '@/components/ops/CodexTab'

export const metadata = { title: 'Field Codex · scienium' }

/**
 * Standalone Field Codex route (deep-link / gateway target). The primary
 * surface is the Operations Hub tab; this renders the same tab full-bleed.
 */
export default function FieldCodexPage() {
  return (
    <div className="min-h-screen bg-[#0d1b2e] text-white flex flex-col">
      <CodexTab />
    </div>
  )
}
