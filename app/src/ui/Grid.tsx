import type { HTMLAttributes } from 'react'

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /** Column layout. Every option collapses to one column under 900px. `sidebar` is 360px plus the rest. */
  cols?: 1 | 2 | 3 | 4 | 'sidebar'
  /** Space above: `section` is the 48px section gap, `tight` is 24px. */
  spaced?: 'none' | 'tight' | 'section'
}

/** Layout grid on the 8px system with 24px gutters. */
export function Grid({ cols = 1, spaced = 'none', className, ...rest }: GridProps) {
  return <div className={['ab-grid', className].filter(Boolean).join(' ')} data-cols={cols === 1 ? undefined : cols} data-spaced={spaced} {...rest} />
}
