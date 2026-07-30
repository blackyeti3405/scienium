'use client'

import { X } from 'lucide-react'

/** A saved link asset: icon + URL + remove button. */
export function LinkRow({ icon, url, onRemove }: { icon: React.ReactNode; url: string; onRemove: () => void }) {
  return (
    <div className="sc-linkrow">
      <span className="shrink-0 text-white/55 flex">{icon}</span>
      <span className="sc-linkrow__url">{url}</span>
      <button className="sc-linkrow__remove" onClick={onRemove} title="Remove">
        <X size={13} />
      </button>
    </div>
  )
}
