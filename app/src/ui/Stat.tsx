import type { ReactNode } from 'react'

export interface StatProps {
  /** 10px uppercase label in Smoke. */
  label: string
  /** The number, already formatted. Rendered at 32px/600 with tabular figures. */
  value: ReactNode
  /** Context or change underneath, in Dusk. */
  delta?: ReactNode
}

/** KPI tile: a white card with one number. Use four in a row at the top of a page. */
export function Stat({ label, value, delta }: StatProps) {
  return (
    <div className="ab-card" data-tone="default">
      <div className="ab-label">{label}</div>
      <div className="ab-stat-value">{value}</div>
      {delta && <div className="ab-stat-delta">{delta}</div>}
    </div>
  )
}

export interface CalloutProps {
  label: string
  value: ReactNode
  /** One sentence that says why this number matters. */
  children?: ReactNode
}

/** Voltage Yellow callout. At most ONE per page, reserved for the headline number. */
export function Callout({ label, value, children }: CalloutProps) {
  return (
    <div className="ab-callout" role="group" aria-label={label}>
      <div className="ab-label">{label}</div>
      <div className="ab-callout-value">{value}</div>
      {children && <p>{children}</p>}
    </div>
  )
}
