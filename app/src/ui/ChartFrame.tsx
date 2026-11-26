import { Tabs as RTabs } from 'radix-ui'
import type { ReactNode } from 'react'
import { Card } from './Card'
import { DataTable, type Column } from './DataTable'

export interface ChartFrameProps {
  /** States the finding, e.g. "Grade B earned 6.1%, the best of any grade". */
  title: string
  sub?: ReactNode
  tags?: string[]
  foot?: ReactNode
  /** The chart. */
  children: ReactNode
  /** The same data as a table. When given, a Chart / Table switch appears in the header. */
  table?: { cols: Column<Record<string, unknown>>[]; rows: Record<string, unknown>[] }
  /** Start on the table view. */
  defaultView?: 'chart' | 'table'
}

/**
 * A card that holds one chart and its table view. The Chart / Table switch is a Radix tab list,
 * so the chart and the table are two panels of the same data.
 */
export function ChartFrame({ title, sub, tags, foot, children, table, defaultView = 'chart' }: ChartFrameProps) {
  if (!table) return <Card tags={tags} title={title} sub={sub} foot={foot}>{children}</Card>
  return (
    <RTabs.Root defaultValue={defaultView} asChild>
      <Card tags={tags} title={title} sub={sub} foot={foot} action={
        <RTabs.List className="ab-tabs-list" data-size="sm" aria-label={`${title}: view`}>
          <RTabs.Trigger value="chart" className="ab-tab">Chart</RTabs.Trigger>
          <RTabs.Trigger value="table" className="ab-tab">Table</RTabs.Trigger>
        </RTabs.List>
      }>
        <RTabs.Content value="chart" className="ab-tabs-content" style={{ marginTop: 0 }}>{children}</RTabs.Content>
        <RTabs.Content value="table" className="ab-tabs-content" style={{ marginTop: 0 }}><DataTable {...table} caption={title} /></RTabs.Content>
      </Card>
    </RTabs.Root>
  )
}
