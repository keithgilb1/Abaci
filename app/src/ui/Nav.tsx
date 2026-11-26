export interface NavItem { id: string; label: string; href: string }

export interface NavProps {
  brand: string
  items: NavItem[]
  /** The id of the current page. Its link gets Electric Blue and `aria-current="page"`. */
  activeId: string
  /** Accessible name for the navigation landmark. */
  label?: string
}

/** Sticky nav pill: 24px radius on Fog, Navy links, the active link in Electric Blue. */
export function Nav({ brand, items, activeId, label = 'Sections' }: NavProps) {
  return (
    <div className="ab-nav-wrap">
      <nav className="ab-nav" aria-label={label}>
        <span className="ab-nav-brand">{brand}</span>
        {items.map(t => (
          <a key={t.id} href={t.href} className="ab-nav-link" aria-current={t.id === activeId ? 'page' : undefined}>{t.label}</a>
        ))}
      </nav>
    </div>
  )
}
