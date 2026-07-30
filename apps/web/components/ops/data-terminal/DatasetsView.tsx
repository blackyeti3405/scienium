'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Table2, BarChart3 } from 'lucide-react'
import { BusyButton } from '@/components/ui/BusyButton'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { LoadRetry } from '@/components/ui/LoadRetry'
import { ApiError } from '@/lib/api/client'
import {
  starterColumns,
  TABLE_TYPES,
  MAX_DATASET_NAME,
  type TableType,
} from '@/lib/data-terminal/dataset'
import { createDataset, deleteDataset, listDatasets, type DatasetSummary } from './datasets-api'
import { DatasetDetail } from './DatasetDetail'

/**
 * The Data lane: a team's datasets, and the editor for the selected one.
 *
 * Replaces the old experiment list. The phase lock is unchanged — datasets open
 * at `working`, exactly when the experiments they replace did — while the five
 * reference guides stay reachable in every phase.
 */
export function DatasetsView({ openDatasetId }: { openDatasetId?: string | null } = {}) {
  const { confirm, alert, dialog } = useConfirm()
  const [datasets, setDatasets] = useState<DatasetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [loadError, setLoadError] = useState(false)
  // Opens straight into a dataset a Charts Guide recipe just created. Only the
  // INITIAL value is honoured — this view remounts when the Data sub-tab is
  // (re)selected, so a later recipe re-seeds it without re-trapping Back.
  const [selectedId, setSelectedId] = useState<string | null>(openDatasetId ?? null)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoadError(false)
    setLoading(true)
    listDatasets()
      .then((d) => setDatasets(d.datasets))
      .catch((err) => {
        // 403 = phase-locked, which is a real state with its own screen rather
        // than a failure to retry.
        if (err instanceof ApiError && err.status === 403) setLocked(true)
        else setLoadError(true)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function remove(dataset: DatasetSummary) {
    if (deletingId) return
    if (
      !(await confirm({
        title: 'Delete dataset',
        message: `Delete "${dataset.name}" and all ${dataset.rowCount} of its rows? This can't be undone.`,
        confirmLabel: 'Delete',
        tone: 'danger',
      }))
    )
      return
    setDeletingId(dataset.id)
    try {
      await deleteDataset(dataset.id)
      setDatasets((list) => list.filter((d) => d.id !== dataset.id))
      if (selectedId === dataset.id) setSelectedId(null)
    } catch {
      await alert({
        title: 'Delete failed',
        message: 'Could not delete the dataset. Please try again.',
      })
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    // Deliberately NOT OpsTabSkeleton: it wraps its rows in `.ops-tab-body`
    // (max-width 720px, centred), while this lane is full width, so the panel
    // visibly snapped wider the moment the list arrived.
    return (
      <div className="dt-pane" aria-busy="true">
        {dialog}
        <div className="dt-listhead">
          <span className="font-pixel text-[9px] text-[#F5C518] uppercase tracking-widest">
            Datasets
          </span>
        </div>
        <div className="dt-list">
          {[0, 1, 2].map((i) => (
            <div key={i} className="dt-list__row dt-skel" aria-hidden="true">
              <span className="dt-skel__bar" style={{ width: `${52 - i * 9}%` }} />
            </div>
          ))}
        </div>
        <span className="sr-only" role="status">
          Loading datasets…
        </span>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="dt-pane">
        {dialog}
        <LoadRetry
          message="Couldn't load your datasets — check your connection."
          onRetry={load}
          testId="datasets-retry"
        />
      </div>
    )
  }

  if (locked) {
    return (
      <div className="ops-tab-body items-center justify-center text-center px-8">
        <BarChart3 className="text-white/40 mb-3" size={28} />
        <span className="font-pixel text-[9px] text-white/40 leading-relaxed">
          The Data Terminal unlocks at the Working phase,
          <br />
          once you start collecting data.
        </span>
        <span className="font-pixel text-[8px] text-white/25 leading-relaxed mt-3">
          The guides above are open now — read them while you plan.
        </span>
      </div>
    )
  }

  if (selectedId) {
    return (
      <>
        {dialog}
        <DatasetDetail
          key={selectedId}
          datasetId={selectedId}
          onBack={() => {
            setSelectedId(null)
            load()
          }}
          onRenamed={(id, name, rowCount) =>
            setDatasets((list) =>
              list.map((d) => (d.id === id ? { ...d, name, rowCount } : d)),
            )
          }
        />
      </>
    )
  }

  return (
    <div className="dt-pane">
      {dialog}
      <div className="dt-listhead">
        <span className="font-pixel text-[9px] text-[#F5C518] uppercase tracking-widest">
          Datasets
        </span>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="dt-btn dt-btn--primary"
          data-testid="new-dataset"
        >
          <Plus size={12} /> New dataset
        </button>
      </div>

      {creating && (
        <NewDatasetForm
          onCancel={() => setCreating(false)}
          onCreated={(dataset) => {
            setDatasets((list) => [dataset, ...list])
            setCreating(false)
            setSelectedId(dataset.id)
          }}
        />
      )}

      {datasets.length === 0 && !creating ? (
        <div className="dt-empty" data-testid="datasets-empty">
          <Table2 size={22} className="text-white/25" />
          <span className="font-pixel text-[8px] text-white/40">
            No datasets yet — start one, or import a CSV.
          </span>
        </div>
      ) : (
        <ul className="dt-list">
          {datasets.map((dataset) => (
            <li key={dataset.id} className="dt-list__row">
              <button
                type="button"
                onClick={() => setSelectedId(dataset.id)}
                className="dt-list__open"
                data-testid={`dataset-${dataset.id}`}
              >
                <span className="dt-list__name">{dataset.name}</span>
                <span className="dt-list__meta">
                  <span className="dt-chip">
                    {TABLE_TYPES.find((t) => t.key === dataset.tableType)?.label ?? dataset.tableType}
                  </span>
                  {dataset.rowCount} row{dataset.rowCount === 1 ? '' : 's'} ×{' '}
                  {dataset.columns.length} column{dataset.columns.length === 1 ? '' : 's'}
                </span>
              </button>
              <BusyButton
                busy={deletingId === dataset.id}
                icon={<Trash2 size={14} />}
                onClick={() => remove(dataset)}
                className="dt-icon-btn dt-icon-btn--danger"
                aria-label={`Delete ${dataset.name}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Creating a dataset asks for the two things that cannot be inferred later
 * without disruption: what it is called, and what SHAPE the data has. The table
 * type is asked here rather than after import because it decides which column
 * roles exist, so choosing it first is what lets an import land already valid.
 */
function NewDatasetForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void
  onCreated: (dataset: DatasetSummary) => void
}) {
  const [name, setName] = useState('')
  const [tableType, setTableType] = useState<TableType>('xy')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const spec = TABLE_TYPES.find((t) => t.key === tableType)!

  async function submit() {
    if (busy || !name.trim()) return
    setBusy(true)
    setError(null)
    try {
      const { dataset } = await createDataset({
        name: name.trim(),
        tableType,
        // Start shaped for the chosen table type rather than empty — see
        // `starterColumns`. Three blank rows so the grid reads as a table
        // waiting for numbers, not as a header with nothing under it.
        columns: starterColumns(tableType),
        rows: Array.from({ length: 3 }, () => starterColumns(tableType).map(() => null)),
      })
      onCreated(dataset)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the dataset.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dt-newform" data-testid="new-dataset-form">
      <label className="dt-field">
        <span className="dt-field__label">Name</span>
        <input
          className="dt-input"
          value={name}
          autoFocus
          maxLength={MAX_DATASET_NAME}
          placeholder="Plant growth trial"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit()
          }}
          data-testid="new-dataset-name"
        />
      </label>

      <fieldset className="dt-typepicker">
        <legend className="dt-field__label">What shape is your data?</legend>
        <div className="dt-typepicker__grid">
          {TABLE_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTableType(t.key)}
              className={`dt-typecard ${tableType === t.key ? 'is-selected' : ''}`}
              aria-pressed={tableType === t.key}
              data-testid={`table-type-${t.key}`}
            >
              <span className="dt-typecard__label">{t.label}</span>
            </button>
          ))}
        </div>
        <p className="dt-field__hint" data-testid="table-type-blurb">
          {spec.blurb}
        </p>
      </fieldset>

      {error && <p className="dt-field__error">{error}</p>}

      <div className="dt-actions">
        <BusyButton
          busy={busy}
          showSpinner={false}
          onClick={submit}
          disabled={!name.trim()}
          className="dt-btn dt-btn--primary"
          data-testid="create-dataset"
        >
          Create
        </BusyButton>
        <button type="button" className="dt-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
