import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/* Fold chart roles. Navy carries the main series, Hyacinth the comparison, Smoke the context,
   Electric Blue the ONE point the title talks about, and the warm loss color is for losses only. */
export const C = {
  main: '#20294c', compare: '#788dba', context: '#979db5', highlight: '#459af8', loss: '#c2410c',
  grid: '#dddfe9', axis: '#c7cbdb', label: '#676b89', surface: '#ffffff',
}
export type Tone = 'main' | 'compare' | 'context' | 'highlight' | 'loss'

function niceTicks(lo: number, hi: number, count = 5): number[] {
  if (lo === hi) { lo -= 1; hi += 1 }
  const step0 = (hi - lo) / count
  const mag = Math.pow(10, Math.floor(Math.log10(step0)))
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0) ?? step0
  const out: number[] = []
  const end = Math.ceil(hi / step - 1e-9)
  for (let i = Math.floor(lo / step + 1e-9); i <= end; i++) out.push(i * step)
  return out
}

type Tip = { x: number; y: number; body: ReactNode } | null

/** Charts draw at the container's real pixel width, so 13px labels stay 13px in any card. */
function useTip() {
  const ref = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<Tip>(null)
  const [width, setWidth] = useState(640)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(Math.max(280, Math.round(el.clientWidth))))
    ro.observe(el)
    setWidth(Math.max(280, Math.round(el.clientWidth)))
    return () => ro.disconnect()
  }, [])
  // Convert SVG viewBox coordinates to container pixels.
  const show = (svgX: number, svgY: number, vbW: number, body: ReactNode) => {
    const el = ref.current
    if (!el) return
    const scale = el.clientWidth / vbW
    setTip({ x: svgX * scale, y: svgY * scale, body })
  }
  const node = tip && <div className="tooltip" style={{ left: tip.x, top: tip.y }}>{tip.body}</div>
  return { ref, show, hide: () => setTip(null), node, width }
}

/* ---------- Horizontal bars ---------- */
export type Bar = { label: string; value: number | null; tone?: Tone; detail?: ReactNode }

export function BarChart({ rows, fmt, refLine, labelWidth = 150, valueWidth = 70 }: {
  rows: Bar[]; fmt: (v: number) => string; refLine?: { value: number; label: string }; labelWidth?: number; valueWidth?: number
}) {
  const t = useTip()
  const W = t.width, rowH = 30, top = refLine ? 22 : 6, H = top + rows.length * rowH + 6
  const vals = rows.map(r => r.value ?? 0).concat(refLine ? [refLine.value] : [], [0])
  const lo = Math.min(...vals), hi = Math.max(...vals)
  const x0 = labelWidth, x1 = W - valueWidth
  const sx = (v: number) => x0 + ((v - lo) / (hi - lo || 1)) * (x1 - x0)
  return (
    <div className="chart" ref={t.ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" onMouseLeave={t.hide}>
        <line x1={sx(0)} x2={sx(0)} y1={top - 4} y2={H} stroke={C.axis} />
        {refLine && (
          <g>
            <line x1={sx(refLine.value)} x2={sx(refLine.value)} y1={top - 4} y2={H} stroke={C.compare} strokeWidth={1.5} />
            <text x={sx(refLine.value)} y={12} textAnchor="middle" className="muted-label">{refLine.label}</text>
          </g>
        )}
        {rows.map((r, i) => {
          const y = top + i * rowH + (rowH - 16) / 2
          const v = r.value ?? 0
          const a = sx(Math.min(0, v)), b = sx(Math.max(0, v))
          const fill = C[r.tone ?? 'main']
          const w = Math.max(b - a, 1)
          const rx = Math.min(4, w / 2)
          // 4px rounded data end, square at the baseline
          const path = v >= 0
            ? `M${a},${y} h${w - rx} a${rx},${rx} 0 0 1 ${rx},${rx} v${16 - 2 * rx} a${rx},${rx} 0 0 1 -${rx},${rx} h-${w - rx} z`
            : `M${b},${y} h-${w - rx} a${rx},${rx} 0 0 0 -${rx},${rx} v${16 - 2 * rx} a${rx},${rx} 0 0 0 ${rx},${rx} h${w - rx} z`
          return (
            <g key={r.label} onMouseMove={() => t.show(v >= 0 ? b : a, y, W, r.detail ?? <><b>{r.label}</b> {r.value == null ? '–' : fmt(r.value)}</>)}>
              <rect x={0} y={top + i * rowH} width={W} height={rowH} fill="transparent" />
              <text x={x0 - 12} y={y + 12} textAnchor="end" className="axis-label" style={{ fontWeight: r.tone === 'highlight' || r.tone === 'loss' ? 600 : 400, fill: r.tone === 'highlight' || r.tone === 'loss' ? C.main : undefined }}>{r.label}</text>
              {r.value != null && <path d={path} fill={fill} />}
              <text x={b + 8} y={y + 12} textAnchor="start" className={r.tone === 'highlight' || r.tone === 'loss' ? 'direct-label' : 'muted-label'}>
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

/* ---------- Vertical columns ---------- */
export function ColumnChart({ labels, values, tones, fmt, height = 260, labelEvery = 1, details }: {
  labels: string[]; values: (number | null)[]; tones?: Tone[]; fmt: (v: number) => string; height?: number; labelEvery?: number; details?: ReactNode[]
}) {
  const t = useTip()
  const W = t.width, H = height, left = 52, right = 8, top = 22, bottom = 28
  const vals = values.map(v => v ?? 0).concat([0])
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals), 4)
  const lo = ticks[0], hi = ticks[ticks.length - 1]
  const sy = (v: number) => top + (1 - (v - lo) / (hi - lo || 1)) * (H - top - bottom)
  const band = (W - left - right) / labels.length
  const bw = Math.min(24, band * 0.6)
  return (
    <div className="chart" ref={t.ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" onMouseLeave={t.hide}>
        {ticks.map(v => (
          <g key={v}>
            <line x1={left} x2={W - right} y1={sy(v)} y2={sy(v)} stroke={v === 0 ? C.axis : C.grid} />
            <text x={left - 8} y={sy(v) + 4} textAnchor="end" className="axis-label">{fmt(v)}</text>
          </g>
        ))}
        {labels.map((l, i) => {
          const v = values[i]
          const cx = left + band * (i + 0.5)
          const tone = tones?.[i] ?? 'main'
          const y0 = sy(0), y1 = v == null ? y0 : sy(v)
          const h = Math.abs(y1 - y0), rx = Math.min(4, h / 2), x = cx - bw / 2
          const d = v == null ? '' : v >= 0
            ? `M${x},${y0} v-${h - rx} a${rx},${rx} 0 0 1 ${rx},-${rx} h${bw - 2 * rx} a${rx},${rx} 0 0 1 ${rx},${rx} v${h - rx} z`
            : `M${x},${y0} v${h - rx} a${rx},${rx} 0 0 0 ${rx},${rx} h${bw - 2 * rx} a${rx},${rx} 0 0 0 ${rx},-${rx} v-${h - rx} z`
          const emph = tone === 'highlight' || tone === 'loss'
          return (
            <g key={l} onMouseMove={() => t.show(cx, Math.min(y0, y1), W, details?.[i] ?? <><b>{l}</b> {v == null ? '–' : fmt(v)}</>)}>
              <rect x={cx - band / 2} y={top} width={band} height={H - top - bottom} fill="transparent" />
              {v != null && <path d={d} fill={C[tone]} />}
              {emph && v != null && <text x={cx} y={v >= 0 ? y1 - 7 : y1 + 15} textAnchor="middle" className="direct-label">{fmt(v)}</text>}
              {i % labelEvery === 0 && <text x={cx} y={H - 8} textAnchor="middle" className="axis-label">{l}</text>}
            </g>
          )
        })}
      </svg>
      {t.node}
    </div>
  )
}

/* ---------- Lines ---------- */
export type Series = { name: string; values: (number | null)[]; tone: Tone; width?: number }

export function LineChart({ labels, series, fmt, height = 280, highlight, labelEvery = 1, yZero = true }: {
  labels: string[]; series: Series[]; fmt: (v: number) => string; height?: number
  highlight?: { series: number; index: number; label?: string }; labelEvery?: number; yZero?: boolean
}) {
  const t = useTip()
  const longest = Math.max(...series.map(s => s.name.length + 6))
  const W = t.width, H = height, left = 52, right = Math.max(40, longest * 7.4 + 16), top = 18, bottom = 28
  const all = series.flatMap(s => s.values.filter((v): v is number => v != null)).concat(yZero ? [0] : [])
  const ticks = niceTicks(Math.min(...all), Math.max(...all), 4)
  const lo = ticks[0], hi = ticks[ticks.length - 1]
  const sx = (i: number) => left + (labels.length === 1 ? 0.5 : i / (labels.length - 1)) * (W - left - right)
  const sy = (v: number) => top + (1 - (v - lo) / (hi - lo || 1)) * (H - top - bottom)
  const [hover, setHover] = useState<number | null>(null)
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - box.left) / box.width) * W
    const i = Math.max(0, Math.min(labels.length - 1, Math.round(((x - left) / (W - left - right)) * (labels.length - 1))))
    setHover(i)
    t.show(sx(i), top + 10, W, <><b>{labels[i]}</b>{series.map(s => <div key={s.name}>{s.name}: {s.values[i] == null ? '–' : fmt(s.values[i] as number)}</div>)}</>)
  }
  // End labels: placed at each line's last value; if two collide, fall back to the legend above the chart.
  const ends = series.map(s => { const i = s.values.length - 1 - [...s.values].reverse().findIndex(v => v != null); return { s, i, y: sy(s.values[i] as number) } })
  const collide = ends.some((a, i) => ends.some((b, j) => i < j && Math.abs(a.y - b.y) < 14))
  return (
    <div className="chart" ref={t.ref}>
      {series.length > 1 && (
        <div className="legend">{series.map(s => <span key={s.name}><i style={{ background: C[s.tone] }} />{s.name}</span>)}</div>
      )}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" onMouseMove={onMove} onMouseLeave={() => { setHover(null); t.hide() }}>
        {ticks.map(v => (
          <g key={v}>
            <line x1={left} x2={W - right} y1={sy(v)} y2={sy(v)} stroke={v === 0 ? C.axis : C.grid} />
            <text x={left - 8} y={sy(v) + 4} textAnchor="end" className="axis-label">{fmt(v)}</text>
          </g>
        ))}
        {labels.map((l, i) => i % labelEvery === 0 && <text key={l} x={sx(i)} y={H - 8} textAnchor="middle" className="axis-label">{l}</text>)}
        {hover != null && <line x1={sx(hover)} x2={sx(hover)} y1={top} y2={H - bottom} stroke={C.axis} />}
        {series.map(s => {
          let d = '', pen = false
          s.values.forEach((v, i) => { if (v == null) { pen = false; return } d += `${pen ? 'L' : 'M'}${sx(i)},${sy(v)} `; pen = true })
          return <path key={s.name} d={d} fill="none" stroke={C[s.tone]} strokeWidth={s.width ?? 2} strokeLinejoin="round" strokeLinecap="round" />
        })}
        {ends.map(({ s, i, y }) => (
          <g key={s.name}>
            <circle cx={sx(i)} cy={y} r={4} fill={C[s.tone]} stroke={C.surface} strokeWidth={2} />
            {!collide && <text x={sx(i) + 10} y={y + 4} className="direct-label">{s.name} {fmt(s.values[i] as number)}</text>}
          </g>
        ))}
        {highlight && series[highlight.series]?.values[highlight.index] != null && (() => {
          const v = series[highlight.series].values[highlight.index] as number
          const x = sx(highlight.index), y = sy(v)
          return (
            <g>
              <circle cx={x} cy={y} r={6} fill={C.highlight} stroke={C.surface} strokeWidth={2} />
              <text x={x} y={y - 12} textAnchor="middle" className="direct-label">{highlight.label ?? fmt(v)}</text>
            </g>
          )
        })()}
        {hover != null && series.map(s => s.values[hover] != null && (
          <circle key={s.name} cx={sx(hover)} cy={sy(s.values[hover] as number)} r={4} fill={C[s.tone]} stroke={C.surface} strokeWidth={2} />
        ))}
      </svg>
      {t.node}
    </div>
  )
}

/* ---------- Frontier: points joined in order, one highlighted ---------- */
export function Frontier({ points, current, fmtX, fmtY, labelFor, height = 280 }: {
  points: { x: number; y: number }[]; current?: { x: number; y: number }; fmtX: (v: number) => string; fmtY: (v: number) => string
  labelFor: (i: number) => string; height?: number
}) {
  const t = useTip()
  const W = t.width, H = height, left = 56, right = 24, top = 24, bottom = 36
  const xs = points.map(p => p.x).concat(current ? [current.x] : [], [0, 1])
  const ys = points.map(p => p.y).concat(current ? [current.y] : [])
  const xt = niceTicks(Math.min(...xs), Math.max(...xs), 5), yt = niceTicks(Math.min(...ys), Math.max(...ys), 4)
  const sx = (v: number) => left + ((v - xt[0]) / (xt[xt.length - 1] - xt[0] || 1)) * (W - left - right)
  const sy = (v: number) => top + (1 - (v - yt[0]) / (yt[yt.length - 1] - yt[0] || 1)) * (H - top - bottom)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x)},${sy(p.y)}`).join(' ')
  return (
    <div className="chart" ref={t.ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" onMouseLeave={t.hide}>
        {yt.map(v => (
          <g key={v}><line x1={left} x2={W - right} y1={sy(v)} y2={sy(v)} stroke={C.grid} />
            <text x={left - 8} y={sy(v) + 4} textAnchor="end" className="axis-label">{fmtY(v)}</text></g>
        ))}
        {xt.map(v => <text key={v} x={sx(v)} y={H - 14} textAnchor="middle" className="axis-label">{fmtX(v)}</text>)}
        <line x1={left} x2={W - right} y1={H - bottom} y2={H - bottom} stroke={C.axis} />
        <path d={d} fill="none" stroke={C.context} strokeWidth={2} />
        {points.map((p, i) => (
          <g key={i} onMouseMove={() => t.show(sx(p.x), sy(p.y), W, labelFor(i))}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={12} fill="transparent" />
            <circle cx={sx(p.x)} cy={sy(p.y)} r={4.5} fill={C.main} stroke={C.surface} strokeWidth={2} />
            {(i === 0 || i === points.length - 1) && <text x={sx(p.x)} y={sy(p.y) - 12} textAnchor="middle" className="muted-label">{labelFor(i).split(':')[0]}</text>}
          </g>
        ))}
        {current && (
          <g>
            <circle cx={sx(current.x)} cy={sy(current.y)} r={7} fill={C.highlight} stroke={C.surface} strokeWidth={2} />
            <text x={sx(current.x)} y={sy(current.y) + 22} textAnchor="middle" className="direct-label">Your policy</text>
          </g>
        )}
      </svg>
      {t.node}
    </div>
  )
}

/* ---------- Table view: every chart has one ---------- */
export type Col = { key: string; label: string; fmt?: (v: unknown) => string; num?: boolean }

export function DataTable({ cols, rows }: { cols: Col[]; rows: Record<string, unknown>[] }) {
  return (
    <div className="table-scroll">
      <table className="data">
        <thead><tr>{cols.map(c => <th key={c.key} className={c.num ? 'num' : ''}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{cols.map(c => <td key={c.key} className={c.num ? 'num' : ''}>{c.fmt ? c.fmt(r[c.key]) : String(r[c.key] ?? '–')}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ChartCard({ title, sub, children, table, foot, tags }: {
  title: string; sub?: ReactNode; children: ReactNode; table?: { cols: Col[]; rows: Record<string, unknown>[] }; foot?: ReactNode; tags?: string[]
}) {
  const [showTable, setShowTable] = useState(false)
  return (
    <div className="card">
      <div className="spread" style={{ alignItems: 'flex-start' }}>
        <div>{(tags ?? []).map(t => <span className="tag" key={t}>{t}</span>)}</div>
        {table && <button className="linkish" onClick={() => setShowTable(s => !s)}>{showTable ? 'Show chart' : 'Show table'}</button>}
      </div>
      <h2>{title}</h2>
      {sub && <p className="sub">{sub}</p>}
      {showTable && table ? <DataTable {...table} /> : children}
      {foot && <p className="foot">{foot}</p>}
    </div>
  )
}
