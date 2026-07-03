'use client'

import { useEffect, useState } from 'react'
import { X, Copy, Download, Loader2, Check, Quote } from 'lucide-react'

// ─── #13 Citation Manager — the team's formatted citation library ──────────────
// Reads GET /api/citations (auto-backfills + returns APA/MLA/IEEE per paper, built
// locally with no LLM) and exports a "Works Cited" bibliography into the Showcase
// via POST /api/citations/export. Full-screen sub-view, mirroring the Q&A panel.

interface CitationRow {
  id: string
  apa: string
  mla: string
  ieee: string
  year: number | null
  paper: { id: string; title: string; authors: string[]; sourceType: string } | null
}

type Style = 'apa' | 'mla' | 'ieee'

const STYLES: { key: Style; label: string }[] = [
  { key: 'apa', label: 'APA' },
  { key: 'mla', label: 'MLA' },
  { key: 'ieee', label: 'IEEE' },
]

const SOURCE_BADGE: Record<string, string> = {
  external: 'Discovered',
  pdf: 'Uploaded',
  text: 'Uploaded',
}

export function CitationsPanel({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<CitationRow[] | null>(null)
  const [style, setStyle] = useState<Style>('apa')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/citations')
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d.citations) ? d.citations : []))
      .catch(() => setRows([]))
  }, [])

  // Alphabetical by the chosen style's string — real bibliography order.
  const sorted = rows
    ? [...rows].sort((a, b) => a[style].localeCompare(b[style]))
    : null

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500)
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  function copyAll() {
    if (!sorted || sorted.length === 0) return
    copy(sorted.map((r) => r[style]).join('\n'), '__all__')
  }

  async function exportWorksCited() {
    setExporting(true)
    setExportMsg(null)
    try {
      const res = await fetch('/api/citations/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Export failed')
      setExportMsg({ ok: true, text: 'Works Cited added to your showcase supplements.' })
    } catch (err) {
      setExportMsg({ ok: false, text: err instanceof Error ? err.message : 'Export failed' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Quote size={14} className="text-[#F5C518]" />
          <h2 className="font-pixel text-[10px] text-white">Citations</h2>
          {sorted && (
            <span className="font-pixel text-[7px] text-white/30 ml-1">{sorted.length}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Style toggle */}
          <div className="flex items-center gap-1">
            {STYLES.map((s) => (
              <button
                key={s.key}
                onClick={() => setStyle(s.key)}
                className={`font-pixel text-[7px] px-2 py-1 rounded-sm transition-colors ${
                  style === s.key
                    ? 'bg-[#F5C518] text-[#0d1b2e]'
                    : 'text-white/45 hover:text-white/80'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {sorted === null ? (
          <div className="flex items-center justify-center h-full gap-2 text-white/40">
            <Loader2 size={16} className="animate-spin text-blue-400" />
            <span className="font-pixel text-[8px]">Building your citations…</span>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-8">
            <Quote size={20} className="text-white/20" />
            <p className="font-pixel text-[8px] text-white/40 leading-loose">
              No citations yet. Upload sources here, or star and promote a paper from the Papers
              tab in Discovery — each one is cited automatically.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map((c) => {
              const text = c[style]
              const badge = c.paper ? SOURCE_BADGE[c.paper.sourceType] : undefined
              return (
                <div
                  key={c.id}
                  className="group flex items-start gap-3 border border-white/10 bg-white/[0.02] rounded-sm px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    {badge && (
                      <span className="font-pixel text-[6px] uppercase tracking-widest text-[#F5C518]/60 block mb-1">
                        {badge}
                      </span>
                    )}
                    {/* Regular font for the reference text — it's reading content. */}
                    <p className="text-[13px] leading-relaxed text-white/80">{text}</p>
                  </div>
                  <button
                    onClick={() => copy(text, c.id)}
                    title="Copy citation"
                    className="shrink-0 flex items-center gap-1 font-pixel text-[7px] border border-white/15 text-white/40 px-2 py-1.5 rounded-sm hover:border-white/35 hover:text-white/70 transition-colors"
                  >
                    {copiedId === c.id ? (
                      <>
                        <Check size={10} className="text-green-400" /> copied
                      </>
                    ) : (
                      <>
                        <Copy size={10} /> copy
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer — copy all + export to showcase */}
      {sorted && sorted.length > 0 && (
        <div className="border-t border-white/10 px-6 py-3 shrink-0 flex flex-col gap-2">
          {exportMsg && (
            <p
              className={`font-pixel text-[7px] leading-relaxed ${
                exportMsg.ok ? 'text-green-300' : 'text-orange-300'
              }`}
            >
              {exportMsg.text}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={copyAll}
              className="flex items-center gap-1.5 font-pixel text-[7px] border border-white/20 text-white/55 px-3 py-2 rounded-sm hover:border-white/40 hover:text-white/80 transition-colors"
            >
              {copiedId === '__all__' ? (
                <>
                  <Check size={11} className="text-green-400" /> copied all
                </>
              ) : (
                <>
                  <Copy size={11} /> Copy all ({STYLES.find((s) => s.key === style)?.label})
                </>
              )}
            </button>
            <button
              onClick={exportWorksCited}
              disabled={exporting}
              className="flex items-center gap-1.5 font-pixel text-[7px] bg-[#F5C518] text-[#0d1b2e] px-3 py-2 rounded-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {exporting ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
              Export Works Cited to Showcase
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
