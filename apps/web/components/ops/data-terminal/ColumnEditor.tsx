'use client'

import { useState } from 'react'
import { Trash2, X, Check } from 'lucide-react'
import { evaluateFormula, FormulaError, FORMULA_FUNCTIONS } from '@/lib/data-terminal/formula'
import {
  tableTypeSpec,
  MAX_COLUMN_NAME,
  MAX_UNIT,
  type CellValue,
  type ColumnRole,
  type ColumnSpec,
  type DataRow,
  type TableType,
} from '@/lib/data-terminal/dataset'

/**
 * Column properties — Prism's "Format Column" and Origin's column designations
 * in one panel.
 *
 * The role selector is the important control on this screen and the reason the
 * panel exists at all: a column's role is what lets an analysis know a Y from a
 * grouping factor, and what makes error bars derived rather than configured.
 * The options offered are only those the current table type actually has, so an
 * invalid combination is not something a student can reach and then be told off
 * for.
 */

const ROLE_HELP: Record<ColumnRole, string> = {
  x: 'The thing you changed or measured against — time, dose, temperature.',
  y: 'A value you measured. In a Column table, each Y column is one group.',
  yErr: 'Pre-computed error for a Y column (SD, SEM, or a 95% interval).',
  xErr: 'Pre-computed error for the X column.',
  group: 'Which group each row belongs to, when groups run down a column.',
  label: 'Names or categories. Shown on the chart, never treated as data.',
  ignore: 'Kept in the table, left out of every chart and analysis.',
}

const ROLE_NAME: Record<ColumnRole, string> = {
  x: 'X — independent variable',
  y: 'Y — measured value',
  yErr: '±Y — error for a Y column',
  xErr: '±X — error for the X column',
  group: 'Group — grouping factor',
  label: 'Label — names or categories',
  ignore: 'Ignore — excluded from analysis',
}

export function ColumnEditor({
  column,
  columns,
  rows,
  tableType,
  onApply,
  onDelete,
  onClose,
}: {
  column: ColumnSpec
  columns: ColumnSpec[]
  rows: DataRow[]
  tableType: TableType
  /**
   * ONE callback for both halves of an edit, deliberately.
   *
   * Applying a formula changes the column spec AND the cells under it. As two
   * separate callbacks those were two updates built from the same captured
   * draft in the same tick, so the second silently discarded the first and the
   * computed column rendered empty. One logical operation, one update.
   */
  onApply: (column: ColumnSpec, rows?: DataRow[]) => void
  onDelete: () => void
  onClose: () => void
}) {
  const spec = tableTypeSpec(tableType)
  const [formula, setFormula] = useState(column.formula ?? '')
  const [formulaError, setFormulaError] = useState<string | null>(null)
  const [formulaOk, setFormulaOk] = useState(false)

  const yColumns = columns.filter((c) => c.role === 'y' && c.id !== column.id && !c.subcolumnOf)
  const xColumn = columns.find((c) => c.role === 'x')
  const index = columns.findIndex((c) => c.id === column.id)

  function applyFormula() {
    setFormulaError(null)
    setFormulaOk(false)
    try {
      const values: CellValue[] = evaluateFormula(formula, {
        columns,
        rows,
        targetId: column.id,
      })
      const next = rows.map((row, r) => {
        const copy = [...row]
        while (copy.length < columns.length) copy.push(null)
        copy[index] = values[r] ?? null
        return copy
      })
      onApply({ ...column, formula, type: 'number' }, next)
      setFormulaOk(true)
    } catch (err) {
      setFormulaError(
        err instanceof FormulaError ? err.message : 'That formula could not be worked out.',
      )
    }
  }

  function clearFormula() {
    setFormula('')
    setFormulaError(null)
    setFormulaOk(false)
    const { formula: _dropped, ...rest } = column
    onApply(rest)
  }

  return (
    <div className="dt-colpanel" data-testid="column-editor">
      <div className="dt-colpanel__head">
        <span className="font-pixel text-[8px] text-[#F5C518] uppercase tracking-widest">
          Column
        </span>
        <button
          type="button"
          onClick={onClose}
          className="dt-icon-btn"
          aria-label="Close column settings"
        >
          <X size={13} />
        </button>
      </div>

      <div className="dt-colpanel__grid">
        <label className="dt-field">
          <span className="dt-field__label">Name</span>
          <input
            className="dt-input"
            value={column.name}
            maxLength={MAX_COLUMN_NAME}
            onChange={(e) => onApply({ ...column, name: e.target.value })}
            data-testid="column-name"
          />
        </label>

        <label className="dt-field">
          <span className="dt-field__label">Unit</span>
          <input
            className="dt-input"
            value={column.unit ?? ''}
            maxLength={MAX_UNIT}
            placeholder="g, cm, °C…"
            onChange={(e) => onApply({ ...column, unit: e.target.value || undefined })}
            data-testid="column-unit"
          />
        </label>

        <label className="dt-field">
          <span className="dt-field__label">Data type</span>
          <div className="ops-select-wrap">
            <select
              className="ops-select"
              value={column.type}
              onChange={(e) => onApply({ ...column, type: e.target.value as ColumnSpec["type"] })}
              data-testid="column-type"
            >
              <option value="number">Number</option>
              <option value="text">Text</option>
              <option value="date">Date</option>
            </select>
          </div>
        </label>

        <label className="dt-field">
          <span className="dt-field__label">Role</span>
          <div className="ops-select-wrap">
            <select
              className="ops-select"
              value={column.role}
              onChange={(e) => {
                const role = e.target.value as ColumnRole
                // Dropping a role that owned a pairing must drop the pairing
                // too, or the dataset keeps a dangling reference that only
                // fails later, at save time.
                const next: ColumnSpec = { ...column, role }
                if (role !== 'yErr' && role !== 'xErr') delete next.pairedWith
                if (role !== 'y') delete next.subcolumnOf
                onApply(next)
              }}
              data-testid="column-role"
            >
              {spec.roles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_NAME[role]}
                </option>
              ))}
            </select>
          </div>
        </label>
      </div>

      <p className="dt-colpanel__help">{ROLE_HELP[column.role]}</p>

      {(column.role === 'yErr' || column.role === 'xErr') && (
        <label className="dt-field">
          <span className="dt-field__label">Belongs to</span>
          <div className="ops-select-wrap">
            <select
              className="ops-select"
              value={column.pairedWith ?? ''}
              onChange={(e) => onApply({ ...column, pairedWith: e.target.value || undefined })}
              data-testid="column-paired"
            >
              <option value="">Choose a column…</option>
              {(column.role === 'yErr' ? yColumns : xColumn ? [xColumn] : []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </label>
      )}

      {spec.allowsReplicates && column.role === 'y' && (
        <label className="dt-field">
          <span className="dt-field__label">Repeat measurement of</span>
          <div className="ops-select-wrap">
            <select
              className="ops-select"
              value={column.subcolumnOf ?? ''}
              onChange={(e) => onApply({ ...column, subcolumnOf: e.target.value || undefined })}
              data-testid="column-replicate"
            >
              <option value="">Not a repeat — its own measurement</option>
              {yColumns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <span className="dt-field__hint">
            Repeats of the same condition. Marking them keeps your n honest and lets
            error bars come from the data instead of being typed in.
          </span>
        </label>
      )}

      <div className="dt-field">
        <span className="dt-field__label">Formula</span>
        <div className="dt-formula-row">
          <input
            className="dt-input dt-input--mono"
            value={formula}
            placeholder="=col(Mass) / col(Volume)"
            onChange={(e) => {
              setFormula(e.target.value)
              setFormulaOk(false)
              setFormulaError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyFormula()
              }
            }}
            data-testid="column-formula"
          />
          <button
            type="button"
            className="dt-btn dt-btn--ghost"
            onClick={applyFormula}
            disabled={!formula.trim()}
            data-testid="apply-formula"
          >
            Apply
          </button>
          {column.formula ? (
            <button type="button" className="dt-btn dt-btn--ghost" onClick={clearFormula}>
              Clear
            </button>
          ) : null}
        </div>
        {formulaError ? (
          <span className="dt-field__error" data-testid="formula-error">
            {formulaError}
          </span>
        ) : formulaOk ? (
          <span className="dt-field__ok">
            <Check size={11} /> Filled {rows.length} row{rows.length === 1 ? '' : 's'}.
          </span>
        ) : (
          <span className="dt-field__hint">
            Works on whole columns. Functions: {FORMULA_FUNCTIONS.join(', ')}.
          </span>
        )}
      </div>

      <button type="button" className="dt-btn dt-btn--danger" onClick={onDelete} data-testid="delete-column">
        <Trash2 size={12} /> Delete column
      </button>
    </div>
  )
}
