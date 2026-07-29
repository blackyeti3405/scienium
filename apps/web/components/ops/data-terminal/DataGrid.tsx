'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { readDelimited } from '@/lib/data-terminal/csv'
import {
  coerceCell,
  formatCell,
  MAX_ROWS_PER_DATASET,
  type ColumnSpec,
  type DataRow,
} from '@/lib/data-terminal/dataset'

/**
 * The spreadsheet. Excel's mental model — click a cell, type, Tab along — over
 * the dataset that every Data Terminal lane reads.
 *
 * Rows are WINDOWED: the cap is 5 000 rows × 40 columns, and mounting 200 000
 * cells locks the tab on the classroom hardware this ships to. Only the visible
 * slice plus a small overscan is in the DOM, which keeps a full-cap import as
 * responsive as a ten-row one. Row height is fixed for exactly this reason —
 * variable heights would mean measuring every row to know where the window is.
 *
 * A cell renders as text until it is being edited, so the grid holds one input
 * at a time rather than one per cell.
 */

/**
 * Row height is owned HERE, not in CSS: the windowing maths converts scrollTop
 * to a row index with it, so a stylesheet that disagreed would place rows at
 * the wrong offsets. Column widths are the opposite case — nothing here
 * measures them, so they stay in `.dt-grid__cell`.
 */
const ROW_HEIGHT = 30
const OVERSCAN = 6
/** Header height, mirrored by `.dt-grid__header` — the scroller adds it. */
const HEAD_HEIGHT = 46
/**
 * Mirrors `.dt-grid__gutter` / `.dt-grid__cell` in globals.css. Only the
 * scroll-into-view maths reads these; the cells themselves are still sized by
 * CSS, so these are a lookup, not a second source of truth for layout.
 */
const GUTTER_WIDTH = 44
const COLUMN_WIDTH = 132

/** Stable per-cell DOM id, so `aria-activedescendant` has something to point at. */
const cellDomId = (r: number, c: number) => `dt-cell-${r}-${c}`

interface Cursor {
  r: number
  c: number
}

export function DataGrid({
  columns,
  rows,
  onRowsChange,
  onHeaderClick,
  activeColumnId,
  height = 420,
}: {
  columns: ColumnSpec[]
  rows: DataRow[]
  onRowsChange: (rows: DataRow[]) => void
  /** Opens the column properties popover — the grid does not own column edits. */
  onHeaderClick: (columnId: string) => void
  activeColumnId?: string | null
  height?: number
}) {
  const [cursor, setCursor] = useState<Cursor | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [scrollTop, setScrollTop] = useState(0)

  const scrollRef = useRef<HTMLDivElement>(null)
  const editRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // One blank row past the data, so there is always somewhere to type next —
  // the affordance every spreadsheet has and no "Add row" button replaces.
  const displayRows = rows.length + 1

  // Shrink to the rows there actually are, up to the cap. A fixed 420px box
  // around ten rows left a third of the panel as empty bordered space, which
  // reads as a broken table rather than a small one.
  const viewportHeight = Math.min(height, displayRows * ROW_HEIGHT)

  const window_ = useMemo(() => {
    const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
    const visible = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2
    return { first, last: Math.min(displayRows, first + visible) }
  }, [scrollTop, viewportHeight, displayRows])

  useEffect(() => {
    // Entering edit mode focuses the input; LEAVING it must hand focus back to
    // the grid, or the browser drops it on <body> when the input unmounts and
    // the next keystroke goes nowhere — keyboard entry died after one cell.
    if (editing) editRef.current?.select()
    else if (cursor) gridRef.current?.focus()
    // `cursor` is deliberately not a dependency: refocusing on every cursor move
    // would fight the scroll container.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  // Opening the column editor narrows the grid, which can push the very column
  // being edited out of sight — the student then tunes a column they cannot
  // see. Bring it back into view whenever the selection changes.
  useEffect(() => {
    if (!activeColumnId) return
    const index = columns.findIndex((c) => c.id === activeColumnId)
    const el = scrollRef.current
    if (index === -1 || !el) return
    const left = GUTTER_WIDTH + index * COLUMN_WIDTH
    if (left < el.scrollLeft) el.scrollLeft = left
    else if (left + COLUMN_WIDTH > el.scrollLeft + el.clientWidth) {
      el.scrollLeft = left + COLUMN_WIDTH - el.clientWidth
    }
  }, [activeColumnId, columns])

  /** The exact stored value, for editing and for the tooltip. */
  const rawAt = useCallback(
    (r: number, c: number): string => {
      const value = rows[r]?.[c]
      return value === null || value === undefined ? '' : String(value)
    },
    [rows],
  )

  /**
   * The value as it should be READ. Editing still opens `rawAt`, so full
   * precision is never lost — only the display is tidied.
   */
  const cellAt = useCallback(
    (r: number, c: number): string => formatCell(rows[r]?.[c] ?? null),
    [rows],
  )

  /**
   * Write one cell, growing the table to reach it. A student who clicks the
   * blank row below their data and types is adding a row; making them press a
   * button first would be the only place in the app that works that way.
   */
  const writeCell = useCallback(
    (r: number, c: number, raw: string) => {
      if (r >= MAX_ROWS_PER_DATASET) return
      const next = rows.map((row) => [...row])
      while (next.length <= r) next.push(columns.map(() => null))
      const row = next[r]!
      while (row.length < columns.length) row.push(null)
      row[c] = coerceCell(raw, columns[c]?.type ?? 'text')
      onRowsChange(next)
    },
    [rows, columns, onRowsChange],
  )

  const commit = useCallback(() => {
    if (cursor && editing) writeCell(cursor.r, cursor.c, draft)
    setEditing(false)
  }, [cursor, editing, draft, writeCell])

  const move = useCallback(
    (dr: number, dc: number) => {
      setCursor((cur) => {
        if (!cur) return cur
        const r = Math.min(Math.max(0, cur.r + dr), displayRows - 1)
        const c = Math.min(Math.max(0, cur.c + dc), columns.length - 1)
        // Keep the cursor in view when arrowing past the window's edge.
        const el = scrollRef.current
        if (el) {
          const top = r * ROW_HEIGHT
          if (top < el.scrollTop) el.scrollTop = top
          else if (top + ROW_HEIGHT > el.scrollTop + viewportHeight)
            el.scrollTop = top + ROW_HEIGHT - viewportHeight
        }
        return { r, c }
      })
    },
    [displayRows, columns.length, viewportHeight],
  )

  function onKeyDown(event: React.KeyboardEvent) {
    // Tab must always be able to LEAVE. Anything else is a WCAG 2.1.2 keyboard
    // trap: focus could enter the grid and never get out to the column panel,
    // the export button, or the rest of the page.
    if (event.key === 'Tab') {
      const atEdge = !cursor || (event.shiftKey ? cursor.c === 0 : cursor.c === columns.length - 1)
      if (atEdge) {
        if (editing) commit()
        setCursor(null)
        return // let the browser move focus out of the grid
      }
      event.preventDefault()
      if (editing) commit()
      move(0, event.shiftKey ? -1 : 1)
      return
    }

    // No cursor yet — a keyboard user has just tabbed in. Seed one instead of
    // ignoring the key, or the grid is operable by mouse only and data entry,
    // the entire point of this lane, is unreachable without one.
    if (!cursor) {
      if (event.key.startsWith('Arrow') || event.key === 'Enter' || event.key === 'F2') {
        event.preventDefault()
        setCursor({ r: 0, c: 0 })
        return
      }
      if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
        setCursor({ r: 0, c: 0 })
        setDraft(event.key)
        setEditing(true)
      }
      return
    }

    if (editing) {
      if (event.key === 'Enter') {
        event.preventDefault()
        commit()
        move(1, 0)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        setEditing(false)
      }
      return
    }

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        move(-1, 0)
        break
      case 'ArrowDown':
        event.preventDefault()
        move(1, 0)
        break
      case 'ArrowLeft':
        event.preventDefault()
        move(0, -1)
        break
      case 'ArrowRight':
        event.preventDefault()
        move(0, 1)
        break
      case 'Enter':
      case 'F2':
        event.preventDefault()
        if (columns[cursor.c]?.formula) break // written by its formula, not by hand
        setDraft(rawAt(cursor.r, cursor.c))
        setEditing(true)
        break
      case 'Delete':
      case 'Backspace':
        event.preventDefault()
        if (columns[cursor.c]?.formula) break
        writeCell(cursor.r, cursor.c, '')
        break
      default:
        // Typing over a selected cell replaces it, as in every spreadsheet.
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
          if (columns[cursor.c]?.formula) break
          setDraft(event.key)
          setEditing(true)
        }
    }
  }

  /**
   * Clipboard paste writes a block starting at the cursor. It deliberately does
   * NOT re-infer column types or roles the way a fresh import does — the
   * student is filling in a table they already set up, and silently retyping
   * their columns underneath them would be the wrong kind of clever.
   */
  function onPaste(event: React.ClipboardEvent) {
    if (!cursor || editing) return
    const text = event.clipboardData.getData('text/plain')
    if (!text.trim()) return
    event.preventDefault()

    const block = readDelimited(text)
    const next = rows.map((row) => [...row])
    for (let i = 0; i < block.length; i++) {
      const r = cursor.r + i
      if (r >= MAX_ROWS_PER_DATASET) break
      while (next.length <= r) next.push(columns.map(() => null))
      const row = next[r]!
      while (row.length < columns.length) row.push(null)
      for (let j = 0; j < block[i]!.length; j++) {
        const c = cursor.c + j
        if (c >= columns.length) break
        row[c] = coerceCell(block[i]![j] ?? '', columns[c]!.type)
      }
    }
    onRowsChange(next)
  }

  if (columns.length === 0) {
    return (
      <div className="dt-grid-empty" data-testid="data-grid-empty">
        <span className="font-pixel text-[8px] text-white/40">
          Add a column to start entering data.
        </span>
      </div>
    )
  }

  const visible: number[] = []
  for (let r = window_.first; r < window_.last; r++) visible.push(r)

  return (
    <div
      ref={gridRef}
      className="dt-grid"
      role="grid"
      aria-label="Dataset"
      aria-rowcount={displayRows + 1}
      aria-colcount={columns.length + 1}
      tabIndex={0}
      // The container holds focus (cells are virtualised, so they cannot own a
      // roving tabindex — the focused element would unmount on scroll). ARIA's
      // other focus model applies instead: the active cell is NAMED here, so a
      // screen reader announces it as the cursor moves. Without either model
      // arrowing around the grid was completely silent.
      aria-activedescendant={cursor ? cellDomId(cursor.r, cursor.c) : undefined}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      data-testid="data-grid"
    >
      <div
        ref={scrollRef}
        className="dt-grid__scroll"
        style={{ height: viewportHeight + HEAD_HEIGHT }}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
      {/* The header lives INSIDE the scroller and is sticky only vertically.
          Outside it, a table wider than the panel scrolled its rows while the
          header stayed put, so the columns and their titles came apart — and
          with fixed-width columns any dataset past ~6 columns is wider than the
          panel once the column editor is open. */}
      <div className="dt-grid__head" role="row" aria-rowindex={1}>
        <div className="dt-grid__gutter dt-grid__gutter--head" role="columnheader" aria-colindex={1}>
          <span className="sr-only">Row</span>
        </div>
        {columns.map((col, c) => (
          <button
            key={col.id}
            type="button"
            role="columnheader"
            aria-colindex={c + 2}
            onClick={() => onHeaderClick(col.id)}
            className={`dt-grid__header ${activeColumnId === col.id ? 'is-active' : ''}`}
            data-testid={`grid-header-${col.id}`}
            title={`${col.name}${col.unit ? ` (${col.unit})` : ''} — click to edit this column`}
          >
            <span className="dt-grid__header-name">{col.name}</span>
            <span className="dt-grid__header-meta">
              <span className={`dt-role dt-role--${col.role}`}>{ROLE_LABEL[col.role]}</span>
              {col.unit ? <span className="dt-grid__unit">{col.unit}</span> : null}
              {col.formula ? <span className="dt-grid__fx" title={col.formula}>fx</span> : null}
            </span>
          </button>
        ))}
        {/* Takes the leftover width so the header rule runs the full span of the
            panel — fixed-width columns otherwise stopped mid-air with bordered
            dead space beside them. */}
        <div className="dt-grid__filler" aria-hidden="true" />
      </div>

        {/* Spacer gives the scrollbar the full height of the un-rendered table. */}
        <div className="dt-grid__body" style={{ height: displayRows * ROW_HEIGHT }}>
          {visible.map((r) => (
            <div
              key={r}
              className="dt-grid__row"
              role="row"
              aria-rowindex={r + 2}
              style={{ top: r * ROW_HEIGHT, height: ROW_HEIGHT }}
            >
              <div className="dt-grid__gutter" role="rowheader" aria-colindex={1}>
                {r + 1}
              </div>
              {columns.map((col, c) => {
                const isCursor = cursor?.r === r && cursor?.c === c
                const computed = Boolean(col.formula)
                return (
                  <div
                    key={col.id}
                    id={cellDomId(r, c)}
                    role="gridcell"
                    aria-colindex={c + 2}
                    aria-selected={isCursor}
                    aria-readonly={computed || undefined}
                    // Names the cell for a screen reader reading it through
                    // `aria-activedescendant`, where the column header is not
                    // otherwise announced.
                    aria-label={`${col.name}, row ${r + 1}${
                      cellAt(r, c) === '' ? ', empty' : `, ${cellAt(r, c)}`
                    }`}
                    className={`dt-grid__cell ${isCursor ? 'is-cursor' : ''} ${
                      col.type === 'number' ? 'is-number' : ''
                    } ${computed ? 'is-computed' : ''}`}
                    onMouseDown={() => {
                      setCursor({ r, c })
                      setEditing(false)
                    }}
                    onDoubleClick={() => {
                      // A computed column is written by its formula. Letting a
                      // student type over one produced a value the next
                      // recalculation silently discarded.
                      if (computed) return
                      setDraft(rawAt(r, c))
                      setEditing(true)
                    }}
                    data-testid={`cell-${r}-${c}`}
                  >
                    {isCursor && editing ? (
                      <input
                        ref={editRef}
                        className="dt-grid__input"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commit}
                        aria-label={`${col.name} row ${r + 1}`}
                      />
                    ) : (
                      cellAt(r, c)
                    )}
                  </div>
                )
              })}
              <div className="dt-grid__filler" aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const ROLE_LABEL: Record<ColumnSpec['role'], string> = {
  x: 'X',
  y: 'Y',
  yErr: '±Y',
  xErr: '±X',
  group: 'GRP',
  label: 'LBL',
  ignore: '—',
}
