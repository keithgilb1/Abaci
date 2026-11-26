import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Fold chart roles, as CSS variables from design/tokens.css. Navy carries the main series,
 * Hyacinth the comparison, Smoke the context, Electric Blue the ONE point the title talks about,
 * and the warm loss color is for losses only.
 */
export const tone = {
  main: 'var(--chart-primary)',
  compare: 'var(--chart-secondary)',
  context: 'var(--chart-tertiary)',
  highlight: 'var(--chart-highlight)',
  loss: 'var(--chart-loss)',
} as const
export type Tone = keyof typeof tone
export const ink = { grid: 'var(--chart-grid)', axis: 'var(--chart-axis)', surface: 'var(--surface-card)', label: 'var(--color-midnight-navy)' } as const

/** Round tick values (1, 2, 2.5, 5 × 10ⁿ) that cover lo..hi. */
export function niceTicks(lo: number, hi: number, count = 5): number[] {
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
export function useChartFrame() {
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
  const node = tip && <div className="ab-tooltip" role="tooltip" style={{ left: tip.x, top: tip.y }}>{tip.body}</div>
  return { ref, show, hide: () => setTip(null), node, width }
}

export const isEmphasis = (t?: Tone) => t === 'highlight' || t === 'loss'

export function Empty({ children = 'No data for this selection.' }: { children?: ReactNode }) {
  return <div className="ab-chart-empty">{children}</div>
}
