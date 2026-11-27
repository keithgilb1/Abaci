import { Tabs as RTabs } from 'radix-ui'
import type { ReactNode } from 'react'

export interface TabItem {
  value: string
  label: ReactNode
  content: ReactNode
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  /** Accessible name for the tab list, e.g. "View". */
  label: string
  /** Uncontrolled starting tab. Defaults to the first item. */
  defaultValue?: string
  /** Controlled value. Pair with `onValueChange`. */
  value?: string
  onValueChange?: (value: string) => void
  size?: 'md' | 'sm'
}

/**
 * Tabs on a Fog pill track, built on Radix Tabs: arrow keys move between tabs,
 * and the panels are wired to their triggers with the right ARIA roles.
 */
export function Tabs({ items, label, defaultValue, value, onValueChange, size = 'md' }: TabsProps) {
  return (
    <RTabs.Root defaultValue={defaultValue ?? items[0]?.value} value={value} onValueChange={onValueChange}>
      <RTabs.List className="ab-tabs-list" aria-label={label} data-size={size}>
        {items.map(t => <RTabs.Trigger key={t.value} value={t.value} className="ab-tab" disabled={t.disabled}>{t.label}</RTabs.Trigger>)}
      </RTabs.List>
      {items.map(t => <RTabs.Content key={t.value} value={t.value} className="ab-tabs-content">{t.content}</RTabs.Content>)}
    </RTabs.Root>
  )
}
