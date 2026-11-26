import type { ReactNode } from 'react'

export function Hero({ eyebrow, title, sub }: { eyebrow: string; title: ReactNode; sub: ReactNode }) {
  return (
    <header className="hero">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{sub}</p>
    </header>
  )
}

export function Kpi({ label, value, delta }: { label: string; value: ReactNode; delta?: ReactNode }) {
  return (
    <div className="card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {delta && <div className="kpi-delta">{delta}</div>}
    </div>
  )
}

/** Voltage callout: at most one per page, for the headline number. */
export function Callout({ label, value, children }: { label: string; value: ReactNode; children: ReactNode }) {
  return (
    <div className="callout">
      <div className="kpi-label">{label}</div>
      <div className="big">{value}</div>
      <p>{children}</p>
    </div>
  )
}

export function Loading({ error }: { error?: string }) {
  if (error) return <div className="card"><p className="error">Couldn't load data: {error}</p><p className="note">Is the API running? <code>make api</code></p></div>
  return <div className="loading">Loading from the semantic layer…</div>
}
