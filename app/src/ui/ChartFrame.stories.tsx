import type { Meta, StoryObj } from '@storybook/react-vite'
import { num, pct, pts } from '../format'
import fx from '../stories/fixtures.json'
import { ChartFrame } from './ChartFrame'
import { BarChart } from './charts/BarChart'

const best = [...fx.byGrade].sort((a, b) => b.net_annualized_return - a.net_annualized_return)[0]
const chart = (
  <BarChart labelWidth={90} fmt={v => pct(v)} refLine={{ value: fx.portfolio.treasury_benchmark_return, label: 'Treasury' }}
    rows={fx.byGrade.map(r => ({ label: `Grade ${r.loan__grade}`, value: r.net_annualized_return, tone: r === best ? 'highlight' : 'main' }))} />
)
const table = {
  rows: fx.byGrade,
  cols: [
    { key: 'loan__grade', label: 'Grade' }, { key: 'loans_issued', label: 'Loans', fmt: num, num: true },
    { key: 'net_annualized_return', label: 'Return', fmt: (v: unknown) => pct(v, 2), num: true },
    { key: 'excess_return_vs_treasury', label: 'vs Treasury', fmt: (v: unknown) => pts(v, 2), num: true },
  ],
}
const meta = {
  title: 'Components/ChartFrame',
  component: ChartFrame,
  args: {
    tags: ['Mature vintages', 'Net of losses'],
    title: `Grade ${best.loan__grade} earned ${pct(best.net_annualized_return)}, the best of any grade`,
    sub: <>Net annualized return by grade. The line is the matched Treasury, {pct(fx.portfolio.treasury_benchmark_return)}.</>,
    foot: 'Return = realized net profit ÷ principal-years outstanding.',
    children: chart,
    table,
  },
  argTypes: { children: { control: false }, table: { control: false }, defaultView: { control: 'inline-radio' } },
  decorators: [Story => <div style={{ maxWidth: 640 }}><Story /></div>],
} satisfies Meta<typeof ChartFrame>
export default meta
type Story = StoryObj<typeof meta>

/** Every chart has a table view. The Chart / Table switch is a Radix tab list. */
export const WithTable: Story = {}
export const StartOnTable: Story = { args: { defaultView: 'table' } }
/** Without `table` the frame is a plain card with no switch. */
export const ChartOnly: Story = { args: { table: undefined } }
