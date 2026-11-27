import type { Meta, StoryObj } from '@storybook/react-vite'
import { pct, pts } from '../../format'
import fx from '../../stories/fixtures.json'
import { BarChart } from './BarChart'

const best = [...fx.byGrade].sort((a, b) => b.net_annualized_return - a.net_annualized_return)[0]
const meta = {
  title: 'Charts/BarChart',
  component: BarChart,
  args: {
    fmt: v => pct(v),
    labelWidth: 90,
    rows: fx.byGrade.map(r => ({ label: `Grade ${r.loan__grade}`, value: r.net_annualized_return, tone: r === best ? 'highlight' : 'main' })),
  },
  argTypes: { rows: { control: 'object' }, fmt: { control: false } },
  decorators: [Story => <div className="ab-card" style={{ maxWidth: 640 }}><Story /></div>],
} satisfies Meta<typeof BarChart>
export default meta
type Story = StoryObj<typeof meta>

/** Navy bars, the ONE bar the title talks about in Electric Blue, direct value labels instead of an axis. */
export const HighlightOne: Story = {}
/** A reference line for the benchmark, labelled above the bars. */
export const WithReferenceLine: Story = { args: { refLine: { value: fx.portfolio.treasury_benchmark_return, label: 'Treasury' } } }
/** Negative values grow left from zero in the loss color. Loss is the only warm color in the system. */
export const Losses: Story = {
  args: {
    fmt: v => pts(v),
    labelWidth: 60,
    rows: fx.byVintage.map(r => ({ label: r.metric_time__year.slice(0, 4), value: r.excess_return_vs_treasury, tone: r.excess_return_vs_treasury < 0 ? 'loss' : 'main' })),
  },
}
export const MissingValue: Story = { args: { rows: [{ label: 'Grade A', value: 0.053 }, { label: 'Grade B', value: null }, { label: 'Grade C', value: 0.069, tone: 'highlight' }] } }
export const Empty: Story = { args: { rows: [] } }
