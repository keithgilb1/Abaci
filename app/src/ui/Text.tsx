import type { HTMLAttributes, ReactNode } from 'react'

export interface NoteProps extends HTMLAttributes<HTMLParagraphElement> {
  /** `muted` for supporting text, `error` for a problem the user needs to fix. */
  tone?: 'muted' | 'error'
}

/** Small supporting text. Errors are announced to screen readers. */
export function Note({ tone = 'muted', ...rest }: NoteProps) {
  return <p className="ab-note" data-tone={tone} role={tone === 'error' ? 'alert' : undefined} {...rest} />
}

/** Uppercase label in the tag style, for field names and question echoes. */
export function Label({ children, as: Tag = 'div', ...rest }: { children: ReactNode; as?: 'div' | 'span' | 'p' } & HTMLAttributes<HTMLElement>) {
  return <Tag className="ab-label" {...rest}>{children}</Tag>
}

/** Monospace block for query specs and compiled SQL. */
export function CodeBlock({ children, label }: { children: ReactNode; label?: string }) {
  return <pre className="ab-code" aria-label={label} tabIndex={0}>{children}</pre>
}

export interface LoadStateProps {
  /** When set, the error replaces the loading message. */
  error?: string
  /** What is loading, shown while the request is in flight. */
  message?: string
  /** A hint on how to fix the error. */
  hint?: ReactNode
}

/** Loading and error placeholder for a page waiting on the API. */
export function LoadState({ error, message = 'Loading from the semantic layer…', hint }: LoadStateProps) {
  if (error) return (
    <div className="ab-card" data-tone="default">
      <Note tone="error">Couldn't load data: {error}</Note>
      {hint && <Note>{hint}</Note>}
    </div>
  )
  return <div className="ab-loading" role="status" aria-live="polite">{message}</div>
}

export function Divider() {
  return <hr className="ab-divider" />
}
