'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { BusyButton } from '@/components/ui/BusyButton'
import type { Asset, Showcase } from '@/components/showcase/useShowcaseEditor'

/** URL input + Add button for link-type assets (video, demo, repo, supplement). */
export function LinkAdder({
  assetType,
  placeholder,
  icon,
  ensureSaved,
  onAdded,
  onError,
}: {
  assetType: 'video' | 'demo_video' | 'repo_link' | 'supplement'
  placeholder: string
  icon: React.ReactNode
  ensureSaved: () => Promise<Showcase | null>
  onAdded: (a: Asset) => void
  onError: (msg: string) => void
}) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)

  async function add() {
    const trimmed = url.trim()
    if (!trimmed) return
    onError('')
    const saved = await ensureSaved()
    if (!saved) return
    setBusy(true)
    try {
      const res = await fetch('/api/showcase/asset/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetType, url: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not add link')
      onAdded(data.asset)
      setUrl('')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not add link')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sc-linkadd">
      <span className="sc-linkadd__icon">{icon}</span>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        placeholder={placeholder}
        className="sc-input sc-linkadd__input"
      />
      <BusyButton
        busy={busy}
        icon={<Check size={13} />}
        onClick={add}
        disabled={!url.trim()}
        className="sc-linkadd__btn font-pixel"
        title="Add"
      />
    </div>
  )
}
