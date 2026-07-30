'use client'

import { useState } from 'react'

/** Dev utility: one-click fill of 25 ready papers. Extracted verbatim from
 *  `LabScene`; only rendered in development builds. */
export function DevFillButton() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function fill() {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/dev/fill-papers', { method: 'POST' })
      const data = await res.json()
      setMsg(res.ok ? `✓ ${data.created} papers added` : data.error ?? 'Error')
    } catch {
      setMsg('Request failed')
    } finally {
      setBusy(false)
      setTimeout(() => setMsg(null), 3000)
    }
  }

  return (
    <button
      type="button"
      className="dev-fab font-pixel"
      onClick={fill}
      disabled={busy}
      title="[DEV] Fill 25 papers"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/scienium-logo.png" alt="" width={24} height={24} className="pixel-art dev-fab__icon" />
      <span className="dev-fab__label">{msg ?? 'DEV'}</span>
    </button>
  )
}
