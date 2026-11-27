import type { ReactNode } from 'react'
import { Empty, ink, isEmphasis, tone, useChartFrame, type Tone } from './core'

export type Bar = {
  label: string
  value: number | null
  /** `main` by default. Use `highlight` on the ONE bar the title is about, `loss` only for losses. */
  tone?: Tone
  /** Tooltip body. Defaults to the label and formatted value. */
  detail?: ReactNode
}

export interface BarChartProps {
  rows: Bar[]
  fmt: (v: number) => string
  /** A vertical reference line, e.g. the matched Treasury yield. */
  refLine?: { value: number; label: string }
  /** Width reserved for the category labels (px). */
  labelWidth?: number
  /** Width reserved for the value labels (px). */
  valueWidth?: number
  /** What the chart shows, for screen readers. */
  ariaLabel?: string
}

/** Horizontal bars with direct value labels. Negative values grow left from a zero axis. */
export function BarChart({ rows, fmt, refLine, labelWidth = 150, valueWidth = 70, ariaLabel }: BarChartProps) {
  const t = useChartFrame()
  if (!rows.length) return <div className="ab-chart" ref={t.ref}><Empty /></div>
  const W = t.width, rowH = 30, top = refLine ? 22 : 6, H = top + rows.length * rowH + 6
  const vals = rows.map(r => r.value ?? 0).concat(refLine ? [refLine.value] : [], [0])
  const lo = Math.min(...vals), hi = Math.max(...vals)
  const x0 = labelWidth, x1 = W - valueWidth
  const sx = (v: number) => x0 + ((v - lo) / (hi - lo || 1)) * (x1 - x0)
  return (
    <div className="ab-chart" ref={t.ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel ?? rows.map(r => `${r.label} ${r.value == null ? 'no data' : fmt(r.value)}`).join(', ')} onMouseLeave={t.hide}>
        <line x1={sx(0)} x2={sx(0)} y1={top - 4} y2={H} style={{ stroke: ink.axis }} />
        {refLine && (
          <g>
            <line x1={sx(refLine.value)} x2={sx(refLine.value)} y1={top - 4} y2={H} style={{ stroke: tone.compare }} strokeWidth={1.5} />
            <text x={sx(refLine.value)} y={12} textAnchor="middle" className="ab-muted-label">{refLine.label}</text>
          </g>
        )}
        {rows.map((r, i) => {
          const y = top + i * rowH + (rowH - 16) / 2
          const v = r.value ?? 0
          const a = sx(Math.min(0, v)), b = sx(Math.max(0, v))
          const w = Math.max(b - a, 1)
          const rx = Math.min(4, w / 2)
          const emph = isEmphasis(r.tone)
          // 4px rounded data end, square at the baseline
          const path = v >= 0
            ? `M${a},${y} h${w - rx} a${rx},${rx} 0 0 1 ${rx},${rx} v${16 - 2 * rx} a${rx},${rx} 0 0 1 -${rx},${rx} h-${w - rx} z`
            : `M${b},${y} h-${w - rx} a${rx},${rx} 0 0 0 -${rx},${rx} v${16 - 2 * rx} a${rx},${rx} 0 0 0 ${rx},${rx} h${w - rx} z`
          return (
            <g key={r.label} onMouseMove={() => t.show(v >= 0 ? b : a, y, W, r.detail ?? <><b>{r.label}</b> {r.value == null ? '–' : fmt(r.value)}</>)}>
              <rect x={0} y={top + i * rowH} width={W} height={rowH} fill="transparent" />
              <text x={x0 - 12} y={y + 12} textAnchor="end" className="ab-axis-label" style={emph ? { fontWeight: 600, fill: ink.label } : undefined}>{r.label}</text>
              {r.value != null && <path d={path} style={{ fill: tone[r.tone ?? 'main'] }} />}
              <text x={b + 8} y={y + 12} textAnchor="start" className={emph ? 'ab-direct-label' : 'ab-muted-label'}>
                {r.value == null ? '–' : fmt(r.value)}
              </text>
            </g>
          )
        })}
      </svg>
      {t.node}
    </div>
  )
}
