import type { ReactNode } from 'react'

export interface TagProps {
  /** Short category text. It is rendered uppercase, so write it in sentence case. */
  children: ReactNode
}

/** Category tag: a Fog pill with a 10px uppercase Smoke label, e.g. GRADE C, 60 MO. */
export function Tag({ children }: TagProps) {
  return <span className="ab-tag">{children}</span>
}

/** A row of tags. Renders nothing when the list is empty. */
export function TagList({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null
  return <div className="ab-card-tags">{tags.map(t => <Tag key={t}>{t}</Tag>)}</div>
}
