import type { ReactNode } from 'react'

export interface FieldProps {
  label: string
  /** The current value, formatted, shown on the right of the label. */
  display?: ReactNode
  /** Id of the element the label describes, so screen readers read them together. */
  id?: string
  children: ReactNode
}

/** A labelled control row: uppercase label on the left, the live value on the right, the control below. */
export function Field({ label, display, id, children }: FieldProps) {
  return (
    <div className="ab-field">
      <div className="ab-field-head">
        <span className="ab-label" id={id}>{label}</span>
        {display != null && <span className="ab-field-value" aria-hidden="true">{display}</span>}
      </div>
      {children}
    </div>
  )
}
