'use client'

import {
  FileText,
  ExternalLink,
  MessageSquare,
  Award,
  Trash2,
} from 'lucide-react'
import { PixelSpinner } from '@/components/ui/PixelSpinner'
import { PixelProgressBar } from '@/components/ui/PixelProgressBar'
import type { Paper } from './types'
import { CredibilityBadge } from './CredibilityBadge'
import { UploadSourceButton } from './UploadSourceButton'

export function PaperSlot({
  paper,
  onUpload,
  isFirst,
  onOpenQA,
  onDelete,
}: {
  paper?: Paper
  onUpload?: (file: File) => void
  isFirst: boolean
  onOpenQA?: (paper: Paper) => void
  onDelete?: (paper: Paper) => void
}) {
  // Filled slot
  if (paper) {
    return (
      <div className="flex flex-col shrink-0 border border-white/15 bg-white/3 rounded-sm overflow-hidden">
        {/* Proficiency banner — green once demonstrated, orange until then */}
        {paper.status === 'ready' &&
          (paper.proficiencyDemonstrated ? (
            <div className="bg-green-500/15 border-b border-green-500/30 px-4 py-1.5 flex items-center gap-2">
              <Award size={11} className="text-green-400 shrink-0" />
              <span className="font-pixel text-[7px] text-green-300 uppercase tracking-widest">
                Proficiency demonstrated
              </span>
            </div>
          ) : (
            <div className="bg-orange-500/20 border-b border-orange-500/30 px-4 py-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
              <span className="font-pixel text-[7px] text-orange-300 uppercase tracking-widest">
                Proficiency not demonstrated
              </span>
            </div>
          ))}

        {/* Content row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <FileText size={14} className="text-white/40 shrink-0" />

          <div className="flex-1 min-w-0">
            {paper.status === 'uploading' ? (
              // Phase 1 — determinate byte progress from the real XHR upload.
              <div className="flex flex-col gap-1.5 max-w-[220px]">
                <span className="font-pixel text-[8px] text-blue-300">Uploading…</span>
                <PixelProgressBar value={paper.uploadProgress ?? 0} />
              </div>
            ) : paper.status === 'processing' ? (
              // Phase 2 — genuinely indeterminate (Vega relevance check + parse).
              <div className="flex items-center gap-2">
                <PixelSpinner size="xs" tone="vega" />
                <span className="font-pixel text-[8px] text-[#7ff2e3]">
                  Vega is checking relevance…
                </span>
              </div>
            ) : paper.status === 'error' ? (
              <div className="flex items-center gap-2">
                <span className="font-pixel text-[8px] text-red-400">
                  Upload failed — see above for details
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm text-white/80 truncate">{paper.title}</p>
                <CredibilityBadge tier={paper.credibilityTier} />
              </div>
            )}
            {paper.authors.length > 0 && (
              <p className="font-pixel text-[7px] text-white/40 truncate mt-0.5">
                {paper.authors.slice(0, 2).join(', ')}
                {paper.authors.length > 2 ? ' et al.' : ''}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {paper.status === 'ready' && (
              <>
                {paper.fileUrl && (
                  <a
                    href={paper.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open PDF"
                    className="flex items-center gap-1.5 font-pixel text-[7px] border border-white/20 text-white/45 px-2.5 py-1.5 hover:border-white/40 hover:text-white/70 transition-colors"
                  >
                    <ExternalLink size={10} />
                    PDF
                  </a>
                )}
                <button
                  onClick={() => onOpenQA?.(paper)}
                  title="Review Q&A"
                  className="flex items-center gap-1.5 font-pixel text-[7px] border border-[#F5C518]/40 text-[#F5C518]/70 px-2.5 py-1.5 hover:border-[#F5C518] hover:text-[#F5C518] transition-colors"
                >
                  <MessageSquare size={10} />
                  Q&amp;A
                </button>
              </>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(paper)}
                title="Delete source"
                className="flex items-center justify-center font-pixel text-[7px] border border-white/15 text-white/40 p-1.5 hover:border-red-500/50 hover:text-red-400 transition-colors"
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Empty slot — only the first empty one shows the upload button
  if (isFirst) return <UploadSourceButton onUpload={onUpload} />

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = Array.from(e.dataTransfer.files).find((f) => f.type === 'application/pdf')
    if (file) onUpload?.(file)
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="border rounded-sm shrink-0 transition-colors border-dashed border-white/10"
      style={{ minHeight: 52 }}
    />
  )
}
