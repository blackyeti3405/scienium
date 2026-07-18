'use client'

import { useEffect, useState } from 'react'
import { X, Grid3x3, Plus } from 'lucide-react'
import { LabeledLoader } from '@/components/ui/LabeledLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { BusyButton } from '@/components/ui/BusyButton'
import { ApiError } from '@/lib/api/client'
import type { LabType } from '@/lib/phase'
import { SYNTHESIS_TEMPLATES, templateForLabType } from '@/content/literature/synthesis-templates'
import { listPapers } from './api'
import { listMatrices, createMatrix } from './synthesisApi'
import { SynthesisMatrixEditor } from './SynthesisMatrixEditor'
import type { Paper, SynthesisMatrixListItem } from './types'

const MIN_PAPERS = 2
const MAX_PAPERS = 4

/**
 * Synthesis Matrix — full-screen sub-view (mirrors `CitationsPanel`): the
 * team's matrix list (or an empty state), a "new matrix" flow (2-4 ready
 * papers + a discipline template picker), and the grid editor once one is
 * open.
 */
export function SynthesisPanel({ onClose, labType }: { onClose: () => void; labType: LabType | null }) {
  const [matrices, setMatrices] = useState<SynthesisMatrixListItem[] | null>(null)
  const [openMatrixId, setOpenMatrixId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [readyPapers, setReadyPapers] = useState<Paper[] | null>(null)
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([])
  const [templateId, setTemplateId] = useState<string>(() => templateForLabType(labType).id)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createBusy, setCreateBusy] = useState(false)

  function loadMatrices() {
    listMatrices()
      .then((d) => setMatrices(d.matrices))
      .catch(() => setMatrices([]))
  }

  useEffect(() => {
    loadMatrices()
  }, [])

  function startCreate() {
    setCreating(true)
    setCreateError(null)
    setSelectedPaperIds([])
    setTemplateId(templateForLabType(labType).id)
    if (!readyPapers) {
      listPapers()
        .then((d) =>
          setReadyPapers(
            d.papers
              .filter((p) => p.status === 'ready')
              .map((p) => ({
                id: p.id,
                title: p.title,
                authors: p.authors,
                status: p.status,
                proficiencyDemonstrated: Boolean(p.proficiencyDemonstrated),
                createdAt: p.createdAt,
              })),
          ),
        )
        .catch(() => setReadyPapers([]))
    }
  }

  function togglePaper(id: string) {
    setSelectedPaperIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id)
      if (prev.length >= MAX_PAPERS) return prev
      return [...prev, id]
    })
  }

  async function submitCreate() {
    if (selectedPaperIds.length < MIN_PAPERS || selectedPaperIds.length > MAX_PAPERS) return
    setCreateBusy(true)
    setCreateError(null)
    try {
      const matrix = await createMatrix(selectedPaperIds, templateId)
      setCreating(false)
      loadMatrices()
      setOpenMatrixId(matrix.id)
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Could not create matrix')
    } finally {
      setCreateBusy(false)
    }
  }

  if (openMatrixId) {
    return (
      <div className="flex flex-col h-full bg-[#0d1b2e] text-white">
        <div className="flex items-center justify-end px-6 py-2 border-b border-white/10 shrink-0">
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={13} />
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <SynthesisMatrixEditor
            matrixId={openMatrixId}
            onBack={() => {
              setOpenMatrixId(null)
              loadMatrices()
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1b2e] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Grid3x3 size={14} className="text-[#F5C518]" />
          <h2 className="font-pixel text-[10px] text-white">Synthesis Matrix</h2>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
          <X size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {creating ? (
          <CreateMatrixForm
            readyPapers={readyPapers}
            selectedPaperIds={selectedPaperIds}
            togglePaper={togglePaper}
            templateId={templateId}
            setTemplateId={setTemplateId}
            createError={createError}
            createBusy={createBusy}
            onSubmit={submitCreate}
            onCancel={() => setCreating(false)}
          />
        ) : matrices === null ? (
          <LabeledLoader label="Loading matrices…" fill="inline" />
        ) : matrices.length === 0 ? (
          <div className="flex flex-col items-center gap-4">
            <EmptyState
              testId="synthesis-empty"
              icon={<Grid3x3 size={20} />}
              message="No synthesis matrices yet"
              hint="Compare 2-4 of your sources side by side — Vega will check what your reading missed."
            />
            <button
              data-testid="synthesis-new"
              onClick={startCreate}
              className="flex items-center gap-1.5 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-4 py-2 rounded-sm hover:brightness-110 transition-all"
            >
              <Plus size={11} /> New matrix
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              data-testid="synthesis-new"
              onClick={startCreate}
              className="self-start flex items-center gap-1.5 font-pixel text-[7px] border border-white/20 text-white/55 px-3 py-2 rounded-sm hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors"
            >
              <Plus size={10} /> New matrix
            </button>
            {matrices.map((m) => (
              <button
                key={m.id}
                data-testid={`synthesis-matrix-${m.id}`}
                onClick={() => setOpenMatrixId(m.id)}
                className="text-left border border-white/10 bg-white/[0.02] rounded-sm px-4 py-3 hover:border-[#F5C518]/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-pixel text-[8px] text-white/85 truncate">{m.title}</span>
                  <span className="font-pixel text-[6px] text-white/30">{m.paperCount} sources</span>
                </div>
                {m.lastCheckedAt && (
                  <span className="font-pixel text-[6px] text-green-300/60 mt-1 block">checked</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CreateMatrixForm({
  readyPapers,
  selectedPaperIds,
  togglePaper,
  templateId,
  setTemplateId,
  createError,
  createBusy,
  onSubmit,
  onCancel,
}: {
  readyPapers: Paper[] | null
  selectedPaperIds: string[]
  togglePaper: (id: string) => void
  templateId: string
  setTemplateId: (id: string) => void
  createError: string | null
  createBusy: boolean
  onSubmit: () => void
  onCancel: () => void
}) {
  const canCreate = selectedPaperIds.length >= MIN_PAPERS && selectedPaperIds.length <= MAX_PAPERS
  const selectedTemplate = SYNTHESIS_TEMPLATES.find((t) => t.id === templateId) ?? null

  return (
    <div className="flex flex-col gap-4" data-testid="synthesis-create-form">
      <div className="flex items-center justify-between">
        <span className="font-pixel text-[8px] text-white/70">
          Pick {MIN_PAPERS}–{MAX_PAPERS} ready sources to compare
          {readyPapers && readyPapers.length >= MIN_PAPERS && (
            <span className="text-white/40">
              {'  '}· {selectedPaperIds.length}/{MAX_PAPERS} chosen · {readyPapers.length} available
            </span>
          )}
        </span>
        <button onClick={onCancel} className="font-pixel text-[7px] text-white/40 hover:text-white/70">
          Cancel
        </button>
      </div>

      {readyPapers === null ? (
        <LabeledLoader label="Loading sources…" fill="inline" />
      ) : readyPapers.length < MIN_PAPERS ? (
        <EmptyState message="You need at least 2 ready sources to build a matrix." />
      ) : (
        <ul className="styled-scroll flex flex-col gap-1.5 max-h-[54vh] overflow-y-auto pr-1">
          {readyPapers.map((p) => {
            const checked = selectedPaperIds.includes(p.id)
            const disabled = !checked && selectedPaperIds.length >= MAX_PAPERS
            return (
              <li key={p.id}>
                <label
                  className={`flex items-center gap-3 px-3.5 py-2.5 border rounded-sm cursor-pointer transition-colors ${
                    checked
                      ? 'border-[#F5C518]/50 bg-[#F5C518]/[0.06]'
                      : 'border-white/10 hover:border-white/25'
                  } ${disabled ? 'opacity-35 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="checkbox"
                    data-testid={`synthesis-pick-${p.id}`}
                    checked={checked}
                    disabled={disabled}
                    onChange={() => togglePaper(p.id)}
                    className="shrink-0 h-4 w-4 accent-[#F5C518]"
                  />
                  <span className="text-[15px] text-white/85 truncate">{p.title}</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="font-pixel text-[7px] text-white/50 uppercase tracking-widest">Column template</span>
        <p className="text-[13px] text-white/45 leading-relaxed">
          A starting set of comparison columns for the grid — pick the one closest to your field. You can rename,
          add, or remove columns on the matrix afterwards.
        </p>
        <select
          data-testid="synthesis-template-select"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full appearance-none bg-[#0a1628] border border-white/15 text-white text-sm px-3 py-2.5 outline-none focus:border-[#F5C518]/60"
        >
          {SYNTHESIS_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        {selectedTemplate && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="text-[12px] text-white/40">Columns:</span>
            {selectedTemplate.columns.map((c) => (
              <span
                key={c.id}
                className="text-[12px] text-white/70 bg-white/[0.06] border border-white/10 rounded-sm px-2 py-0.5"
              >
                {c.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {createError && <span className="font-pixel text-[7px] text-red-400">{createError}</span>}

      <BusyButton
        busy={createBusy}
        busyLabel="Creating…"
        disabled={!canCreate}
        onClick={onSubmit}
        data-testid="synthesis-create-submit"
        className="self-start flex items-center gap-1.5 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        Create matrix
      </BusyButton>
    </div>
  )
}
