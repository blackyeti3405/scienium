'use client'

import { useState, useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { BusyButton } from '@/components/ui/BusyButton'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import { uploadWithProgress } from '@/lib/uploadWithProgress'

export function AttachmentUploader({ urls, onChange }: { urls: string[]; onChange: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // FormData + progress callback — stays on `uploadWithProgress` (XHR), not
  // `requestJson`, which can't report upload progress.
  async function upload(file: File) {
    setUploading(true)
    setProgress(0)
    setUploadError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await uploadWithProgress('/api/project-log/attachment', form, (fraction) =>
        setProgress(Math.round(fraction * 100)),
      )
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      onChange([...urls, data.url!])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5 flex-wrap">
        {urls.map((url, i) => (
          <div key={i} className="ops-thumb-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`attachment ${i + 1}`} className="ops-thumb" />
            <button
              type="button"
              className="ops-thumb__remove"
              onClick={() => onChange(urls.filter((_, j) => j !== i))}
              title="Remove"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        <BusyButton
          busy={uploading}
          busyLabel="Uploading…"
          icon={<ImagePlus size={15} />}
          onClick={() => inputRef.current?.click()}
          className="ops-upload-btn"
          spinnerTone="chrome"
          title="Add photo"
        >
          <span className="font-pixel text-[7px]">Add photo</span>
        </BusyButton>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) upload(f)
            e.target.value = ''
          }}
        />
      </div>
      {uploading && <PixelProgressBar value={progress} className="max-w-[200px]" />}
      {uploadError && <p className="font-pixel text-[7px] text-red-400">{uploadError}</p>}
    </div>
  )
}
