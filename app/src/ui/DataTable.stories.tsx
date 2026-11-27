import type { Meta, StoryObj } from '@storybook/react-vite'
import { num, pct, pts } from '../format'
import fx from '../stories/fixtures.json'
import { DataTable, type Column } from './DataTable'

type Row = Record<string, unknown>
const cols: Column<Row>[] = [
  { key: 'loan__grade', label: 'Grade' },
  { key: 'loans_issued', label: 'Loans', fmt: num, num: true },
  { key: 'weighted_avg_interest_rate', label: 'Rate', fmt: v => pct(v), num: true },
  { key: 'charge_off_rate', label: 'Charged off', fmt: v => pct(v), num: true },
  { key: 'net_annualized_return', label: 'Return', fmt: v => pct(v, 2), num: true },
  { key: 'excess_return_vs_treasury', label: 'vs Treasury', fmt: v => pts(v, 2), num: true },
]
const meta = {
  title: 'Components/DataTable',
  component: DataTable<Row>,
  args: { cols, rows: fx.byGrade, caption: 'Returns by grade' },
  argTypes: { cols: { control: false }, rows: { control: false } },
  decorators: [Story => <div className="ab-card"><Story /></div>],
} satisfies Meta<typeof DataTable<Row>>
export default meta
type Story = StoryObj<typeof meta>

/** Real figures: mature Lending Club loans by grade. Numbers are right-aligned with tabular figures. */
export const Default: Story = {}
export const RowHeaders: Story = { args: { rowHeader: true } }
/** Past `maxHeight` the table scrolls inside its card and the header sticks. */
export const Scrolling: Story = { args: { maxHeight: 160 } }
/** Cells can carry a token-colored tint, as in the Pricing heatmap. */
export const LossTint: Story = {
  args: {
    rows: fx.byVintage,
    cols: [
      { key: 'metric_time__year', label: 'Vintage', fmt: v => String(v).slice(0, 4) },
      {
        key: 'excess_return_vs_treasury', label: 'Excess over Treasury', fmt: v => pts(v, 2), num: true,
        cellStyle: r => ((r.excess_return_vs_treasury as number) < 0 ? { background: 'color-mix(in srgb, var(--chart-loss) 12%, transparent)' } : undefined),
      },
    ],
  },
}
export const Empty: Story = { args: { rows: [] } }
