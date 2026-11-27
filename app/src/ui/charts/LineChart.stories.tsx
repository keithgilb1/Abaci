import type { Meta, StoryObj } from '@storybook/react-vite'
import { pct } from '../../format'
import fx from '../../stories/fixtures.json'
import { LineChart } from './LineChart'

const v = fx.byVintage
const bestIdx = v.reduce((bi, r, i) => (r.net_annualized_return > v[bi].net_annualized_return ? i : bi), 0)
const meta = {
  title: 'Charts/LineChart',
  component: LineChart,
  args: {
    labels: v.map(r => r.metric_time__year.slice(0, 4)),
    fmt: x => pct(x, 0),
    series: [
      { name: 'Loans', tone: 'main', values: v.map(r => r.net_annualized_return) },
      { name: 'Treasury', tone: 'compare', values: v.map(r => r.treasury_benchmark_return) },
    ],
  },
  argTypes: { fmt: { control: false } },
  decorators: [Story => <div className="ab-card" style={{ maxWidth: 640 }}><Story /></div>],
} satisfies Meta<typeof LineChart>
export default meta
type Story = StoryObj<typeof meta>

/** Navy for the main series, Hyacinth for the comparison. Lines are labelled at their ends; hover for values. */
export const MainVsComparison: Story = {}
/** ONE point in Electric Blue, the one the title talks about. */
export const WithHighlight: Story = { args: { highlight: { series: 0, index: bestIdx, label: `${v[bestIdx].metric_time__year.slice(0, 4)}: ${pct(v[bestIdx].net_annualized_return)}` } } }
/** The loss color, for a line that is a loss. When end labels would collide, the legend takes over. */
export const PriceVersusLoss: Story = {
  args: {
    series: [
      { name: 'Priced spread', tone: 'main', values: v.map(r => r.priced_spread_over_treasury) },
      { name: 'Net loss', tone: 'loss', values: v.map(r => r.net_charge_off_rate) },
    ],
  },
}
/** Null values break the line instead of drawing through the gap. */
export const WithGap: Story = { args: { series: [{ name: 'Loans', tone: 'main', values: v.map((r, i) => (i === 3 || i === 4 ? null : r.net_annualized_return)) }] } }
export const Empty: Story = { args: { labels: [], series: [] } }
