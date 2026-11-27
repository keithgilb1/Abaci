import type { CSSProperties, ReactNode } from 'react'

export interface Column<R = Record<string, unknown>> {
  key: string
  label: string
  /** Format the raw cell value. Ignored when `render` is set. */
  fmt?: (v: unknown) => string
  /** Render the whole cell from the row, for cells that need markup. */
  render?: (row: R) => ReactNode
  /** Right-align with tabular figures. */
  num?: boolean
  /** Per-cell style, e.g. a loss tint. Keep it to token colors. */
  cellStyle?: (row: R) => CSSProperties | undefined
  /** Per-cell tooltip text. */
  cellTitle?: (row: R) => string | undefined
}

export interface DataTableProps<R> {
  cols: Column<R>[]
  rows: R[]
  /** Visually hidden caption, so screen readers know what the table is. */
  caption?: string
  /** Scroll inside the card past this height (px). `none` lets the table grow. */
  maxHeight?: number | 'none'
  /** The first column is a row header (a grade, a state). */
  rowHeader?: boolean
}

const hidden: CSSProperties = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }

/** Every chart has a table view. Uppercase Smoke headers, Mist row rules, tabular numbers. */
export function DataTable<R extends Record<string, unknown>>({ cols, rows, caption, maxHeight = 360, rowHeader }: DataTableProps<R>) {
  const cell = (c: Column<R>, r: R) => (c.render ? c.render(r) : c.fmt ? c.fmt(r[c.key]) : String(r[c.key] ?? '–'))
  return (
    <div className="ab-table-scroll" style={{ maxHeight: maxHeight === 'none' ? undefined : maxHeight }} tabIndex={0} role="region" aria-label={caption ?? 'Table'}>
      <table className="ab-table">
        {caption && <caption style={hidden}>{caption}</caption>}
        <thead><tr>{cols.map(c => <th key={c.key} scope="col" data-num={c.num || undefined}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c, j) => {
                const p = { key: c.key, 'data-num': c.num || undefined, style: c.cellStyle?.(r), title: c.cellTitle?.(r) }
                return rowHeader && j === 0 ? <th scope="row" {...p}>{cell(c, r)}</th> : <td {...p}>{cell(c, r)}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
