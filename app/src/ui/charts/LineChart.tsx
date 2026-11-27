import { useState, type MouseEvent } from 'react'
import { Empty, ink, niceTicks, tone, useChartFrame, type Tone } from './core'

export type Series = { name: string; values: (number | null)[]; tone: Tone; width?: number }

export interface LineChartProps {
  labels: string[]
  series: Series[]
  fmt: (v: number) => string
  height?: number
  /** Mark ONE point in Electric Blue, with a label. */
  highlight?: { series: number; index: number; label?: string }
  labelEvery?: number
  /** Include zero on the y axis. On by default so small changes don't look dramatic. */
  yZero?: boolean
  ariaLabel?: string
}

/**
 * Lines labelled at their ends. If two end labels would collide, a legend appears above instead.
 * Null values break the line rather than drawing through a gap.
 */
export function LineChart({ labels, series, fmt, height = 280, highlight, labelEvery = 1, yZero = true, ariaLabel }: LineChartProps) {
  const t = useChartFrame()
  const [hover, setHover] = useState<number | null>(null)
  const all = series.flatMap(s => s.values.filter((v): v is number => v != null))
  if (!labels.length || !all.length) return <div className="ab-chart" ref={t.ref}><Empty /></div>
  const longest = Math.max(...series.map(s => s.name.length + 6))
  const W = t.width, H = height, left = 52, right = Math.max(40, longest * 7.4 + 16), top = 18, bottom = 28
  const ticks = niceTicks(Math.min(...all.concat(yZero ? [0] : [])), Math.max(...all.concat(yZero ? [0] : [])), 4)
  const lo = ticks[0], hi = ticks[ticks.length - 1]
  const sx = (i: number) => left + (labels.length === 1 ? 0.5 : i / (labels.length - 1)) * (W - left - right)
  const sy = (v: number) => top + (1 - (v - lo) / (hi - lo || 1)) * (H - top - bottom)
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - box.left) / box.width) * W
    const i = Math.max(0, Math.min(labels.length - 1, Math.round(((x - left) / (W - left - right)) * (labels.length - 1))))
    setHover(i)
    t.show(sx(i), top + 10, W, <><b>{labels[i]}</b>{series.map(s => <div key={s.name}>{s.name}: {s.values[i] == null ? '–' : fmt(s.values[i] as number)}</div>)}</>)
  }
  // End labels sit at each line's last value; if two collide, fall back to the legend above the chart.
  const ends = series.map(s => { const i = s.values.length - 1 - [...s.values].reverse().findIndex(v => v != null); return { s, i, y: sy(s.values[i] as number) } })
  const collide = ends.some((a, i) => ends.some((b, j) => i < j && Math.abs(a.y - b.y) < 14))
  const summary = series.map(s => `${s.name} from ${labels[0]} to ${labels[labels.length - 1]}, ending at ${fmt(s.values[ends.find(e => e.s === s)!.i] as number)}`).join('; ')
  return (
    <div className="ab-chart" ref={t.ref}>
      {series.length > 1 && (
        <div className="ab-legend" aria-hidden="true">{series.map(s => <span key={s.name}><i style={{ background: tone[s.tone] }} />{s.name}</span>)}</div>
      )}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel ?? summary} onMouseMove={onMove} onMouseLeave={() => { setHover(null); t.hide() }}>
        {ticks.map(v => (
          <g key={v}>
            <line x1={left} x2={W - right} y1={sy(v)} y2={sy(v)} style={{ stroke: v === 0 ? ink.axis : ink.grid }} />
            <text x={left - 8} y={sy(v) + 4} textAnchor="end" className="ab-axis-label">{fmt(v)}</text>
          </g>
        ))}
        {labels.map((l, i) => i % labelEvery === 0 && <text key={l} x={sx(i)} y={H - 8} textAnchor="middle" className="ab-axis-label">{l}</text>)}
        {hover != null && <line x1={sx(hover)} x2={sx(hover)} y1={top} y2={H - bottom} style={{ stroke: ink.axis }} />}
        {series.map(s => {
          let d = '', pen = false
          s.values.forEach((v, i) => { if (v == null) { pen = false; return } d += `${pen ? 'L' : 'M'}${sx(i)},${sy(v)} `; pen = true })
          return <path key={s.name} d={d} fill="none" style={{ stroke: tone[s.tone] }} strokeWidth={s.width ?? 2} strokeLinejoin="round" strokeLinecap="round" />
        })}
        {ends.map(({ s, i, y }) => (
          <g key={s.name}>
            <circle cx={sx(i)} cy={y} r={4} style={{ fill: tone[s.tone], stroke: ink.surface }} strokeWidth={2} />
            {!collide && <text x={sx(i) + 10} y={y + 4} className="ab-direct-label">{s.name} {fmt(s.values[i] as number)}</text>}
          </g>
        ))}
        {highlight && series[highlight.series]?.values[highlight.index] != null && (() => {
          const v = series[highlight.series].values[highlight.index] as number
          const x = sx(highlight.index), y = sy(v)
          return (
            <g>
              <circle cx={x} cy={y} r={6} style={{ fill: tone.highlight, stroke: ink.surface }} strokeWidth={2} />
              <text x={x} y={y - 12} textAnchor="middle" className="ab-direct-label">{highlight.label ?? fmt(v)}</text>
            </g>
          )
        })()}
        {hover != null && series.map(s => s.values[hover] != null && (
          <circle key={s.name} cx={sx(hover)} cy={sy(s.values[hover] as number)} r={4} style={{ fill: tone[s.tone], stroke: ink.surface }} strokeWidth={2} />
        ))}
      </svg>
      {t.node}
    </div>
  )
}
