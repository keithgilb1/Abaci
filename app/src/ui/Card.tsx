import type { HTMLAttributes, ReactNode } from 'react'
import { TagList } from './Tag'

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** `default` is white on fog with the navy-tinted shadow. `nested` is a flat Fog surface inside a card. */
  tone?: 'default' | 'nested'
  /** Category tags above the title. */
  tags?: string[]
  /** The card title states the finding, not the topic. */
  title?: ReactNode
  /** One supporting sentence in Dusk. */
  sub?: ReactNode
  /** Small print under the content: method notes, caveats. */
  foot?: ReactNode
  /** Something on the right of the header row, such as a Reset button or view switcher. */
  action?: ReactNode
  /** Stick to the top of the viewport while the page scrolls (used for the Policy Lab controls). */
  sticky?: boolean
  /** Title heading level. Card titles default to h2 because each page has a single h1 hero. */
  headingLevel?: 2 | 3
  as?: 'div' | 'section' | 'article' | 'aside'
}

/** White card on fog. 12px radius, 24px padding, no border. */
export function Card({ tone = 'default', tags, title, sub, foot, action, sticky, headingLevel = 2, as: Tag = 'div', className, children, ...rest }: CardProps) {
  const H = headingLevel === 3 ? 'h3' : 'h2'
  // With tags, the header row is tags + action and the title sits below. Without tags, the title shares the row with the action.
  const titleEl = title && <H className="ab-card-title">{title}</H>
  const titleInHead = !tags?.length && Boolean(action)
  const head = (tags?.length || action) && (
    <div className="ab-card-head" data-title={titleInHead || undefined}>
      {titleInHead ? titleEl : <TagList tags={tags} />}
      {action}
    </div>
  )
  return (
    <Tag className={['ab-card', className].filter(Boolean).join(' ')} data-tone={tone} data-sticky={sticky || undefined} {...rest}>
      {head}
      {!titleInHead && titleEl}
      {sub && <p className="ab-card-sub">{sub}</p>}
      {children}
      {foot && <p className="ab-card-foot">{foot}</p>}
    </Tag>
  )
}
