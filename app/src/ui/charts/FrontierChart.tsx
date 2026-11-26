import { Empty, ink, niceTicks, tone, useChartFrame } from './core'

export interface FrontierChartProps {
  /** Points in sweep order; they are joined by a Smoke line. */
  points: { x: number; y: number }[]
  /** The user's current setting, drawn in Electric Blue. */
  current?: { x: number; y: number }
  currentLabel?: string
  fmtX: (v: number) => string
  fmtY: (v: number) => string
  /** Tooltip text per point. The part before ":" labels the two end points. */
  labelFor: (i: number) => string
  height?: number
  ariaLabel?: string
}

/** A trade-off curve: each point is one setting of a control, one point is "you are here". */
export function FrontierChart({ points, current, currentLabel = 'Your policy', fmtX, fmtY, labelFor, height = 280, ariaLabel }: FrontierChartProps) {
  const t = useChartFrame()
  if (!points.length) return <div className="ab-chart" ref={t.ref}><Empty /></div>
  const W = t.width, H = height, left = 56, right = 24, top = 24, bottom = 36
  const xs = points.map(p => p.x).concat(current ? [current.x] : [], [0, 1])
  const ys = points.map(p => p.y).concat(current ? [current.y] : [])
  const xt = niceTicks(Math.min(...xs), Math.max(...xs), 5), yt = niceTicks(Math.min(...ys), Math.max(...ys), 4)
  const sx = (v: number) => left + ((v - xt[0]) / (xt[xt.length - 1] - xt[0] || 1)) * (W - left - right)
  const sy = (v: number) => top + (1 - (v - yt[0]) / (yt[yt.length - 1] - yt[0] || 1)) * (H - top - bottom)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x)},${sy(p.y)}`).join(' ')
  return (
    <div className="ab-chart" ref={t.ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel ?? `${points.length} points from ${labelFor(0)} to ${labelFor(points.length - 1)}`} onMouseLeave={t.hide}>
        {yt.map(v => (
          <g key={v}><line x1={left} x2={W - right} y1={sy(v)} y2={sy(v)} style={{ stroke: ink.grid }} />
            <text x={left - 8} y={sy(v) + 4} textAnchor="end" className="ab-axis-label">{fmtY(v)}</text></g>
        ))}
        {xt.map(v => <text key={v} x={sx(v)} y={H - 14} textAnchor="middle" className="ab-axis-label">{fmtX(v)}</text>)}
        <line x1={left} x2={W - right} y1={H - bottom} y2={H - bottom} style={{ stroke: ink.axis }} />
        <path d={d} fill="none" style={{ stroke: tone.context }} strokeWidth={2} />
        {points.map((p, i) => (
          <g key={i} onMouseMove={() => t.show(sx(p.x), sy(p.y), W, labelFor(i))}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={12} fill="transparent" />
            <circle cx={sx(p.x)} cy={sy(p.y)} r={4.5} style={{ fill: tone.main, stroke: ink.surface }} strokeWidth={2} />
            {(i === 0 || i === points.length - 1) && <text x={sx(p.x)} y={sy(p.y) - 12} textAnchor="middle" className="ab-muted-label">{labelFor(i).split(':')[0]}</text>}
          </g>
        ))}
        {current && (
          <g>
            <circle cx={sx(current.x)} cy={sy(current.y)} r={7} style={{ fill: tone.highlight, stroke: ink.surface }} strokeWidth={2} />
            <text x={sx(current.x)} y={sy(current.y) + 22} textAnchor="middle" className="ab-direct-label">{currentLabel}</text>
          </g>
        )}
      </svg>
      {t.node}
    </div>
  )
}
