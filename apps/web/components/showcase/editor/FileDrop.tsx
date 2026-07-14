'use client'

import { useRef, useState } from 'react'
import { ExternalLink, FileText, FileUp, LayoutGrid, X } from 'lucide-react'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import { uploadWithProgress } from '@/lib/uploadWithProgress'
import type { Asset, Showcase } from '@/components/showcase/useShowcaseEditor'

/** Board / quad-chart upload block: drop-style picker with an inline progress
 *  bar while uploading, and a preview + Open/Remove bar once an asset exists. */
export function FileDrop({
  asset,
  kind,
  accept,
  label,
  sub,
  ensureSaved,
  onAdded,
  onRemove,
  onError,
}: {
  asset?: Asset
  kind: 'board' | 'quad_chart'
  accept: string
  label: string
  sub: string
  ensureSaved: () => Promise<Showcase | null>
  onAdded: (a: Asset) => void
  onRemove: (id: string) => void
  onError: (msg: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    onError('')
    const saved = await ensureSaved()
    if (!saved) return
    setUploading(true)
    setProgress(0)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('kind', kind)
      const res = await uploadWithProgress('/api/showcase/asset', form, (fraction) =>
        setProgress(Math.round(fraction * 100)),
      )
      const data = (await res.json()) as { asset?: Asset; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      onAdded(data.asset!)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (asset?.url) {
    const isImage = asset.kind === 'image'
    return (
      <div className="sc-file">
        <div className="sc-file__preview">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.url} alt={kind} />
          ) : (
            <div className="sc-file__pdf">
              <FileText size={26} />
              <span className="font-pixel">PDF</span>
            </div>
          )}
        </div>
        <div className="sc-file__bar">
          <span className="sc-file__name font-pixel">
            {isImage ? <LayoutGrid size={11} /> : <FileText size={11} />}
            {isImage ? 'Image' : 'PDF'}
          </span>
          <a href={asset.url} target="_blank" rel="noopener noreferrer" className="sc-file__open font-pixel">
            <ExternalLink size={10} /> Open
          </a>
          <button className="sc-file__remove font-pixel" onClick={() => onRemove(asset.id)}>
            <X size={11} /> Remove
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="sc-drop">
        {uploading ? (
          <div className="flex flex-col items-center gap-2 w-full px-4">
            <span className="font-pixel text-[8px]">Uploading… {progress}%</span>
            <PixelProgressBar value={progress} className="max-w-[160px]" />
          </div>
        ) : (
          <>
            <FileUp size={22} />
            <span className="font-pixel text-[8px]">{label}</span>
            <span className="sc-drop__sub">{sub}</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) upload(f)
          e.target.value = ''
        }}
      />
    </>
  )
}
