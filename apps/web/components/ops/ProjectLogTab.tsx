'use client'

import { AlertTriangle, BookOpen, ArrowRight, Pencil, Trash2 } from 'lucide-react'
import { SafeMarkdown } from '@/components/ui/SafeMarkdown'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { BusyButton } from '@/components/ui/BusyButton'
import { OpsTabSkeleton } from '@/components/ui/skeletons/OpsTabSkeleton'
import { Avatar, formatDate, timeAgo } from './log-shared'
import { ProjectLogForm } from './project-log/ProjectLogForm'
import { LinkEntryPicker, ReferenceChips } from './project-log/ReferenceChips'
import { useProjectLog } from './project-log/useProjectLog'

export function ProjectLogTab() {
  const { confirm, alert, dialog } = useConfirm()
  const {
    entries,
    members,
    labType,
    loading,
    loadError,
    total,
    hasOlder,
    loadingOlder,
    loadOlder,
    editingId,
    setEditingId,
    deletingId,
    removingRefId,
    handleSaved,
    handleAddReference,
    handleRemoveReference,
    handleDelete,
  } = useProjectLog({ confirm, alert })

  if (loading) {
    return (
      <>
        {dialog}
        <OpsTabSkeleton variant="log" />
      </>
    )
  }

  if (loadError) {
    return (
      <div className="ops-tab-body items-center justify-center text-center">
        {dialog}
        <AlertTriangle size={20} className="text-white/40 mb-2" />
        <span className="font-pixel text-[8px] text-white/40">{loadError}</span>
      </div>
    )
  }

  return (
    <div className="ops-tab-body">
      {dialog}
      <ProjectLogForm
        members={members}
        labType={labType}
        headerNumber={total + 1}
        onSaved={handleSaved}
      />

      {entries.length === 0 ? (
        // Kept local over <EmptyState>: `.ops-empty` (borderless, min-height
        // flex centering) predates the primitive and styles differently —
        // visual parity wins.
        <div className="ops-empty">
          <BookOpen size={22} className="text-white/40 mb-2" />
          <span className="font-pixel text-[8px] text-white/40">No entries yet — log your first session above.</span>
        </div>
      ) : (
        <>
          <div className="ops-timeline-header">
            <span className="font-pixel text-[7px] text-white/40 uppercase tracking-widest">
              {total} {total === 1 ? 'entry' : 'entries'}
            </span>
            <div className="ops-timeline-header__line" />
          </div>
          <div className="ops-timeline">
            {entries.map((e) => {
              if (editingId === e.id) {
                return (
                  <div key={e.id} className="ops-log-entry">
                    <div className="ops-log-entry__rail">
                      <span className="ops-log-entry__num font-pixel">{e.entryNumber}</span>
                    </div>
                    <div className="flex-1 min-w-0 mb-4">
                      <ProjectLogForm
                        members={members}
                        labType={labType}
                        headerNumber={e.entryNumber}
                        entry={e}
                        onSaved={handleSaved}
                        onCancel={() => setEditingId(null)}
                      />
                    </div>
                  </div>
                )
              }
              const attendeeNames = members
                .filter((m) => e.attendeeIds.includes(m.userId) && m.userId !== e.createdBy.id)
                .map((m) => m.name)
              return (
                <div key={e.id} className="ops-log-entry">
                  <div className="ops-log-entry__rail">
                    <span className="ops-log-entry__num font-pixel">{e.entryNumber}</span>
                  </div>
                  <div className="ops-log-entry__card">
                    <div className="ops-log-entry__head">
                      <Avatar name={e.createdBy.name} size={24} />
                      <div className="flex flex-col min-w-0">
                        <span className="font-pixel text-[7px] text-white/70">
                          {e.createdBy.name}
                          {attendeeNames.length > 0 && (
                            <span className="text-white/40"> + {attendeeNames.join(', ')}</span>
                          )}
                        </span>
                        <span className="font-pixel text-[6px] text-white/40 mt-0.5">
                          {formatDate(e.createdAt)} · {timeAgo(e.createdAt)}
                          {e.lastEditedBy && (
                            <span className="text-white/40"> · edited by {e.lastEditedBy.name}</span>
                          )}
                        </span>
                      </div>
                      {e.stage && <span className="ops-stage-badge font-pixel">{e.stage}</span>}
                      <div className="ops-entry-actions">
                        <button onClick={() => setEditingId(e.id)} className="ops-icon-btn" title="Edit entry">
                          <Pencil size={12} />
                        </button>
                        <BusyButton
                          busy={deletingId === e.id}
                          icon={<Trash2 size={12} />}
                          onClick={() => handleDelete(e)}
                          className="ops-icon-btn ops-icon-btn--danger"
                          title="Delete entry"
                        />
                      </div>
                    </div>

                    <div className="ops-md text-sm text-white/80 leading-relaxed">
                      <SafeMarkdown>{e.body}</SafeMarkdown>
                    </div>

                    {e.attachmentUrls.length > 0 && (
                      <div className="ops-photo-row">
                        {e.attachmentUrls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="ops-photo-link">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`entry ${e.entryNumber} photo ${i + 1}`} className="ops-photo" />
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="ops-nextsteps">
                      <span className="ops-nextsteps__label font-pixel">
                        <ArrowRight size={9} /> Next steps
                      </span>
                      <p className="text-sm text-[#F5C518]/80 leading-relaxed mt-1">{e.nextSteps}</p>
                    </div>

                    <ReferenceChips
                      title="Linked entries"
                      refs={e.links}
                      onRemove={(targetId) => handleRemoveReference(e.id, targetId)}
                      removingId={removingRefId}
                      testId="log-links"
                    />
                    <ReferenceChips title="Referenced by" refs={e.backlinks} testId="log-backlinks" />

                    {entries.length > 1 && (
                      <LinkEntryPicker entry={e} allEntries={entries} onAdd={handleAddReference} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Older entries load on demand — the first page carries the newest 30 (PERF-4). */}
          {hasOlder && (
            <div className="flex justify-center py-3">
              <BusyButton
                busy={loadingOlder}
                busyLabel="Loading…"
                onClick={loadOlder}
                className="font-pixel text-[8px] border border-white/20 text-white/50 px-4 py-2 hover:border-[#F5C518]/60 hover:text-[#F5C518] transition-all"
                data-testid="log-load-older"
              >
                Load older entries
              </BusyButton>
            </div>
          )}
        </>
      )}
    </div>
  )
}
