import type { ReactNode } from 'react'
import { Empty, ink, isEmphasis, niceTicks, tone, useChartFrame, type Tone } from './core'

export interface ColumnChartProps {
  labels: string[]
  values: (number | null)[]
  /** One tone per column. Highlighted and loss columns get a direct value label. */
  tones?: Tone[]
  fmt: (v: number) => string
  height?: number
  /** Label every nth column on the x axis, for long series. */
  labelEvery?: number
  /** Tooltip body per column. */
  details?: ReactNode[]
  ariaLabel?: string
}

/** Vertical columns on a zero baseline, for values over time such as vintages. */
export function ColumnChart({ labels, values, tones, fmt, height = 260, labelEvery = 1, details, ariaLabel }: ColumnChartProps) {
  const t = useChartFrame()
  if (!labels.length) return <div className="ab-chart" ref={t.ref}><Empty /></div>
  const W = t.width, H = height, left = 52, right = 8, top = 22, bottom = 28
  const vals = values.map(v => v ?? 0).concat([0])
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals), 4)
  const lo = ticks[0], hi = ticks[ticks.length - 1]
  const sy = (v: number) => top + (1 - (v - lo) / (hi - lo || 1)) * (H - top - bottom)
  const band = (W - left - right) / labels.length
  const bw = Math.min(24, band * 0.6)
  return (
    <div className="ab-chart" ref={t.ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel ?? labels.map((l, i) => `${l} ${values[i] == null ? 'no data' : fmt(values[i] as number)}`).join(', ')} onMouseLeave={t.hide}>
        {ticks.map(v => (
          <g key={v}>
            <line x1={left} x2={W - right} y1={sy(v)} y2={sy(v)} style={{ stroke: v === 0 ? ink.axis : ink.grid }} />
            <text x={left - 8} y={sy(v) + 4} textAnchor="end" className="ab-axis-label">{fmt(v)}</text>
          </g>
        ))}
        {labels.map((l, i) => {
          const v = values[i]
          const cx = left + band * (i + 0.5)
          const tn = tones?.[i] ?? 'main'
          const y0 = sy(0), y1 = v == null ? y0 : sy(v)
          const h = Math.abs(y1 - y0), rx = Math.min(4, h / 2), x = cx - bw / 2
          const d = v == null ? '' : v >= 0
            ? `M${x},${y0} v-${h - rx} a${rx},${rx} 0 0 1 ${rx},-${rx} h${bw - 2 * rx} a${rx},${rx} 0 0 1 ${rx},${rx} v${h - rx} z`
            : `M${x},${y0} v${h - rx} a${rx},${rx} 0 0 0 ${rx},${rx} h${bw - 2 * rx} a${rx},${rx} 0 0 0 ${rx},-${rx} v-${h - rx} z`
          return (
            <g key={l} onMouseMove={() => t.show(cx, Math.min(y0, y1), W, details?.[i] ?? <><b>{l}</b> {v == null ? '–' : fmt(v)}</>)}>
              <rect x={cx - band / 2} y={top} width={band} height={H - top - bottom} fill="transparent" />
              {v != null && <path d={d} style={{ fill: tone[tn] }} />}
              {isEmphasis(tn) && v != null && <text x={cx} y={v >= 0 ? y1 - 7 : y1 + 15} textAnchor="middle" className="ab-direct-label">{fmt(v)}</text>}
              {i % labelEvery === 0 && <text x={cx} y={H - 8} textAnchor="middle" className="ab-axis-label">{l}</text>}
            </g>
          )
        })}
      </svg>
      {t.node}
    </div>
  )
}
