'use client'

import { useRef } from 'react'
import { Upload } from 'lucide-react'

/**
 * The upload affordance shown in the first empty source slot: a click-or-drop
 * PDF dropzone. Extracted from the empty `PaperSlot` branch so the upload path
 * is its own component.
 */
export function UploadSourceButton({ onUpload }: { onUpload?: (file: File) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = Array.from(e.dataTransfer.files).find((f) => f.type === 'application/pdf')
    if (file) onUpload?.(file)
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="border rounded-sm shrink-0 transition-colors border-dashed border-white/25 hover:border-white/45 cursor-pointer bg-white/2 hover:bg-white/4"
      style={{ minHeight: 52 }}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="flex items-center justify-center gap-2 h-full py-4">
        <Upload size={13} className="text-white/40" />
        <span className="font-pixel text-[8px] text-white/40">Upload source</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onUpload?.(file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
