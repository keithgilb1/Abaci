import type { ReactNode } from 'react'

export interface HeroProps {
  /** The question this page answers, as a small uppercase line. */
  eyebrow: string
  /** ONE poster headline that states the finding, e.g. "Grade E loans lost money." */
  title: ReactNode
  /** One 18px Dusk sentence with the evidence. */
  sub?: ReactNode
}

/** Page hero. The only centered text in the system, and the page's only h1. */
export function Hero({ eyebrow, title, sub }: HeroProps) {
  return (
    <header className="ab-hero">
      <div className="ab-eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </header>
  )
}
