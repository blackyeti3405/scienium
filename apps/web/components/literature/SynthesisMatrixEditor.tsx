'use client'

import { useState } from 'react'
import { Plus, X, Check, AlertTriangle, Sparkles } from 'lucide-react'
import { BusyButton } from '@/components/ui/BusyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { LabeledLoader } from '@/components/ui/LabeledLoader'
import { MAX_COLUMNS } from '@/content/literature/synthesis-templates'
import { useSynthesisMatrix } from './useSynthesisMatrix'

/**
 * The Synthesis Matrix grid itself: discipline-adaptive, student-editable
 * columns (header row) × the team's chosen papers (rows), plus Vega's
 * "check my synthesis" verdict panel. Owns `useSynthesisMatrix` directly —
 * mirrors QAPanel owning its feature hooks.
 */
export function SynthesisMatrixEditor({ matrixId, onBack }: { matrixId: string; onBack: () => void }) {
  const {
    matrix,
    loading,
    error,
    busy,
    cellText,
    setCellText,
    saveCell,
    addColumn,
    renameColumn,
    removeColumn,
    applySuggestedColumn,
    optionalColumns,
    canCheck,
    checking,
    checkError,
    lastResult,
    runCheck,
  } = useSynthesisMatrix(matrixId)

  const [addingColumn, setAddingColumn] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  if (loading) {
    return <LabeledLoader label="Loading matrix…" fill="panel" />
  }

  if (!matrix) {
    return (
      <div className="p-6">
        <EmptyState message={error ?? 'Could not load this matrix'} testId="synthesis-editor-error" />
        <button
          onClick={onBack}
          className="mt-4 font-pixel text-[7px] border border-white/20 text-white/55 px-3 py-2 rounded-sm hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors"
        >
          Back
        </button>
      </div>
    )
  }

  const verdict = lastResult?.verdict ?? matrix.lastCheck
  const suggestedAvailable = optionalColumns.filter(
    (o) => !matrix.columns.some((c) => c.id === o.id || c.label.toLowerCase() === o.label.toLowerCase()),
  )

  // Cells a check flagged as misreading their source — ring-highlighted below.
  const flaggedCells = new Set((verdict?.cellIssues ?? []).map((c) => `${c.paperId}:${c.columnId}`))

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 shrink-0">
        <button
          onClick={onBack}
          className="font-pixel text-[7px] text-white/45 hover:text-white/80 transition-colors"
        >
          ← All matrices
        </button>
        <span className="font-pixel text-[8px] text-white truncate max-w-[320px]">{matrix.title}</span>
        <div className="flex items-center gap-2">
          {matrix.kpAwarded > 0 && (
            <span className="font-pixel text-[7px] text-[#F5C518]">+{matrix.kpAwarded} KP</span>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-3 px-3 py-2 bg-red-500/15 border border-red-500/30 rounded-sm">
          <span className="font-pixel text-[7px] text-red-300">{error}</span>
        </div>
      )}

      {/* Grid.
          NO left padding on this scroll container: `position: sticky; left: 0`
          anchors to the padding edge, so a `pl` here leaves a gap between the
          panel edge and the sticky Source column that scrolled cells leak
          through. The left inset lives INSIDE the sticky cells instead (pl-6),
          where it's part of their opaque background and moves with them. Right
          padding is safe (no sticky-right column). */}
      <div className="styled-scroll flex-1 overflow-auto py-6 pr-6">
        <div data-testid="synthesis-grid" className="inline-block min-w-full">
          {/* border-separate (not collapse): position:sticky on a cell inside a
              border-collapse table paints its background and borders out of sync
              in Chrome/Safari, so scrolled cells bled OVER the sticky Source
              column. border-spacing-0 keeps the single-line look. */}
          <table className="border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="text-left pl-6 pr-2 py-2 sticky left-0 bg-[#0d1b2e] z-20 border-r border-white/10 min-w-[184px]">
                  <span className="font-pixel text-[7px] text-white/40 uppercase">Source</span>
                </th>
                {matrix.columns.map((col, i) => (
                  <th
                    key={col.id}
                    className={`text-left p-2 align-top min-w-[220px] ${i === 0 ? '' : 'border-l border-white/10'}`}
                  >
                    {renamingId === col.id ? (
                      <input
                        autoFocus
                        value={renameDraft}
                        maxLength={40}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={() => {
                          const trimmed = renameDraft.trim()
                          if (trimmed && trimmed !== col.label) renameColumn(col.id, trimmed)
                          setRenamingId(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur()
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        data-testid="synthesis-column-rename-input"
                        className="w-full bg-[#0a1628] border border-[#F5C518]/50 text-white font-pixel text-[8px] px-1.5 py-1 outline-none"
                      />
                    ) : (
                      <div className="flex items-center justify-between gap-1.5 group">
                        <button
                          title="Rename column"
                          data-testid="synthesis-column-header"
                          onClick={() => {
                            setRenamingId(col.id)
                            setRenameDraft(col.label)
                          }}
                          className="font-pixel text-[8px] text-[#F5C518] text-left hover:underline truncate"
                        >
                          {col.label}
                        </button>
                        {matrix.columns.length > 1 && (
                          <button
                            title="Remove column"
                            onClick={() => removeColumn(col.id)}
                            className="text-white/40 hover:text-red-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    )}
                    {col.hint && <p className="mt-1 text-[10px] text-white/40 leading-snug">{col.hint}</p>}
                  </th>
                ))}
                <th className="p-2 align-top min-w-[160px]">
                  {addingColumn ? (
                    <div className="flex flex-col gap-1.5 bg-[#0a1628] border border-white/15 rounded-sm p-2">
                      {suggestedAvailable.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            addColumn(opt.label, opt.hint)
                            setAddingColumn(false)
                          }}
                          className="font-pixel text-[7px] text-left text-white/60 hover:text-[#F5C518] transition-colors"
                        >
                          + {opt.label}
                        </button>
                      ))}
                      <div className="flex gap-1 mt-1">
                        <input
                          value={customLabel}
                          onChange={(e) => setCustomLabel(e.target.value)}
                          maxLength={40}
                          placeholder="Custom column…"
                          className="min-w-0 flex-1 bg-[#0d1b2e] border border-white/15 text-white text-[11px] px-1.5 py-1 outline-none focus:border-[#F5C518]/60"
                        />
                        <button
                          disabled={!customLabel.trim() || matrix.columns.length >= MAX_COLUMNS}
                          onClick={() => {
                            addColumn(customLabel.trim())
                            setCustomLabel('')
                            setAddingColumn(false)
                          }}
                          className="font-pixel text-[7px] bg-[#F5C518] text-[#0d1b2e] px-2 py-1 rounded-sm disabled:opacity-40"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      data-testid="synthesis-add-column"
                      disabled={matrix.columns.length >= MAX_COLUMNS || busy}
                      onClick={() => setAddingColumn(true)}
                      className="flex items-center gap-1 font-pixel text-[7px] border border-dashed border-white/20 text-white/45 px-2.5 py-1.5 rounded-sm hover:border-[#F5C518]/50 hover:text-[#F5C518] transition-colors disabled:opacity-40"
                    >
                      <Plus size={10} /> Add column
                    </button>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {matrix.papers.map((paper) => (
                <tr key={paper.id}>
                  <td className="pl-6 pr-2 py-2 align-top sticky left-0 bg-[#0d1b2e] z-20 border-r border-white/10 min-w-[184px]">
                    <span className="font-pixel text-[8px] text-white/75 leading-relaxed">{paper.title}</span>
                  </td>
                  {matrix.columns.map((col, i) => {
                    const flagged = flaggedCells.has(`${paper.id}:${col.id}`)
                    return (
                      <td key={col.id} className={`p-2 align-top ${i === 0 ? '' : 'border-l border-white/10'}`}>
                        <textarea
                          data-testid={`synthesis-cell-${paper.id}-${col.id}`}
                          value={cellText(paper.id, col.id)}
                          onChange={(e) => setCellText(paper.id, col.id, e.target.value)}
                          onBlur={() => saveCell(paper.id, col.id)}
                          maxLength={400}
                          rows={3}
                          placeholder="…"
                          className={`w-full min-w-[200px] bg-[#0a1628] border text-white/85 text-[13px] leading-relaxed px-2 py-1.5 outline-none resize-y focus:border-[#F5C518]/60 ${
                            flagged ? 'border-orange-400/60 ring-1 ring-orange-400/40' : 'border-white/12'
                          }`}
                        />
                      </td>
                    )
                  })}
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Check bar */}
      <div className="border-t border-white/10 px-6 py-3 shrink-0 flex items-center justify-between gap-3">
        {checkError && <span className="font-pixel text-[7px] text-red-400">{checkError}</span>}
        <div className="flex-1" />
        <BusyButton
          busy={checking}
          busyLabel="Checking…"
          icon={<Sparkles size={11} />}
          spinnerTone="vega"
          disabled={!canCheck}
          onClick={runCheck}
          data-testid="synthesis-check"
          className="flex items-center gap-1.5 font-pixel text-[8px] bg-[#F5C518] text-[#0d1b2e] px-4 py-2 rounded-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Check my synthesis
        </BusyButton>
      </div>

      {/* Verdict panel */}
      {verdict && (
        <div
          data-testid="synthesis-verdict"
          className="border-t border-white/10 px-6 py-5 max-h-[45%] overflow-y-auto flex flex-col gap-5"
        >
          {lastResult?.cached && (
            <span className="font-pixel text-[6px] uppercase tracking-widest text-white/40">
              cached — grid unchanged since last check
            </span>
          )}

          {/* The grid moved while Vega was reading (a teammate edited it). The
              verdict below is true of what was submitted, so it is shown — but
              nothing was stored and no KP was awarded against a grid that is no
              longer on screen (P1-R13). */}
          {lastResult?.stale && (
            <span
              data-testid="synthesis-verdict-stale"
              className="font-pixel text-[6px] uppercase tracking-widest text-orange-300/90"
            >
              your grid changed while Vega was reading — this answers the version you sent, and was
              not saved
            </span>
          )}

          <p className="text-[13px] leading-relaxed text-white/70">{verdict.summary}</p>

          <VerdictSection title="Agreements" empty="No agreements found across your sources.">
            {verdict.agreements.map((f, i) => (
              <FindingRow key={`agree-${i}`} finding={f} />
            ))}
          </VerdictSection>

          <VerdictSection title="Contradictions" empty="No contradictions found across your sources.">
            {verdict.contradictions.map((f, i) => (
              <FindingRow key={`contra-${i}`} finding={f} />
            ))}
          </VerdictSection>

          <VerdictSection title="Gaps" empty="No obvious gaps flagged.">
            {verdict.gaps.map((g, i) => (
              <li key={`gap-${i}`} className="flex items-start gap-2">
                <AlertTriangle size={11} className="text-white/40 shrink-0 mt-0.5" />
                <span className="text-[12px] text-white/65 leading-relaxed">{g.text}</span>
              </li>
            ))}
          </VerdictSection>

          {verdict.cellIssues.length > 0 && (
            <div>
              <span className="font-pixel text-[7px] text-orange-300/80 uppercase tracking-widest">
                Cells to double-check
              </span>
              <ul className="mt-2 flex flex-col gap-1.5">
                {verdict.cellIssues.map((c, i) => (
                  <li key={`issue-${i}`} className="text-[12px] text-white/60 leading-relaxed">
                    {c.note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {verdict.suggestedColumns.length > 0 && (
            <div>
              <span className="font-pixel text-[7px] text-white/40 uppercase tracking-widest">
                Suggested columns
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {verdict.suggestedColumns.map((s, i) => (
                  <button
                    key={`suggest-${i}`}
                    title={s.hint}
                    onClick={() => applySuggestedColumn(s.label, s.hint)}
                    data-testid="synthesis-suggested-column"
                    className="flex items-center gap-1 font-pixel text-[7px] border border-[#F5C518]/40 text-[#F5C518] px-2.5 py-1.5 rounded-sm hover:bg-[#F5C518]/10 transition-colors"
                  >
                    <Plus size={9} /> {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function VerdictSection({
  title,
  empty,
  children,
}: {
  title: string
  empty: string
  children: React.ReactNode[]
}) {
  return (
    <div>
      <span className="font-pixel text-[7px] text-white/50 uppercase tracking-widest">{title}</span>
      {children.length === 0 ? (
        <div className="mt-2">
          <EmptyState message={empty} bordered={false} />
        </div>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">{children}</ul>
      )}
    </div>
  )
}

function FindingRow({
  finding,
}: {
  finding: { columnId: string; claim: string; studentNoticed: boolean }
}) {
  return (
    <li className="flex items-start gap-2">
      {finding.studentNoticed ? (
        <span className="flex items-center gap-1 font-pixel text-[6px] text-green-300/80 border border-green-400/30 rounded-sm px-1.5 py-0.5 shrink-0 mt-0.5">
          <Check size={9} /> You caught this
        </span>
      ) : (
        <span
          data-testid="synthesis-missed"
          className="flex items-center gap-1 font-pixel text-[6px] text-orange-300/90 border border-orange-400/40 rounded-sm px-1.5 py-0.5 shrink-0 mt-0.5"
        >
          <AlertTriangle size={9} /> You MISSED this
        </span>
      )}
      <span className="text-[12px] text-white/70 leading-relaxed">{finding.claim}</span>
    </li>
  )
}
