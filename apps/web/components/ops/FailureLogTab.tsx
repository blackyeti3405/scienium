'use client'

import { AlertTriangle, Pencil, Trash2 } from 'lucide-react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { BusyButton } from '@/components/ui/BusyButton'
import { OpsTabSkeleton } from '@/components/ui/skeletons/OpsTabSkeleton'
import { Avatar, formatDate, timeAgo } from './log-shared'
import { FailureForm } from './failure-log/FailureForm'
import { FailureFollowup } from './failure-log/FailureFollowup'
import { useFailureLog } from './failure-log/useFailureLog'

export function FailureLogTab() {
  const { confirm, alert, dialog } = useConfirm()
  const {
    entries,
    loading,
    loadError,
    editingId,
    setEditingId,
    deletingId,
    handleSaved,
    handleFollowupUpdated,
    handleDelete,
  } = useFailureLog({ confirm, alert })

  if (loading) {
    return (
      <>
        {dialog}
        <OpsTabSkeleton variant="log" />
      </>
    )
  }

  return (
    <div className="ops-tab-body">
      {dialog}
      <FailureForm onSaved={handleSaved} />

      {/* Both blocks below stay on the local `.ops-empty` chrome (borderless,
          min-height flex centering) rather than <EmptyState> (dashed border) —
          visual parity wins over adoption. */}
      {loadError ? (
        <div className="ops-empty">
          <AlertTriangle size={22} className="text-white/40 mb-2" />
          <span className="font-pixel text-[8px] text-white/40">{loadError}</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="ops-empty">
          <AlertTriangle size={22} className="text-white/40 mb-2" />
          <span className="font-pixel text-[8px] text-white/40">No failures logged yet — every setback is data.</span>
        </div>
      ) : (
        <div className="ops-timeline">
          {entries.map((e, i) => {
            const num = entries.length - i
            if (editingId === e.id) {
              return (
                <div key={e.id} className="ops-log-entry">
                  <div className="ops-log-entry__rail">
                    <span className="ops-log-entry__num ops-log-entry__num--failure font-pixel">{num}</span>
                  </div>
                  <div className="flex-1 min-w-0 mb-4">
                    <FailureForm entry={e} onSaved={handleSaved} onCancel={() => setEditingId(null)} />
                  </div>
                </div>
              )
            }
            return (
              <div key={e.id} className="ops-log-entry">
                <div className="ops-log-entry__rail">
                  <span className="ops-log-entry__num ops-log-entry__num--failure font-pixel">{num}</span>
                </div>
                <div className="ops-log-entry__card">
                  <div className="ops-log-entry__head">
                    <Avatar name={e.author} size={24} />
                    <div className="flex flex-col min-w-0">
                      <span className="font-pixel text-[7px] text-white/70">{e.author}</span>
                      <span className="font-pixel text-[6px] text-white/40 mt-0.5">
                        {formatDate(e.createdAt)} · {timeAgo(e.createdAt)}
                        {e.editedBy && <span className="text-white/40"> · edited by {e.editedBy}</span>}
                      </span>
                    </div>
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
                  <p className="font-pixel text-[6px] text-white/40 uppercase tracking-widest mb-1">What failed</p>
                  <p className="text-sm text-white/80 leading-relaxed mb-3">{e.happened}</p>
                  <div className="ops-nextsteps">
                    <span className="ops-nextsteps__label font-pixel">What I learned</span>
                    <p className="text-sm text-[#F5C518]/80 leading-relaxed mt-1">{e.learned}</p>
                  </div>
                  <FailureFollowup entry={e} onUpdated={handleFollowupUpdated} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
