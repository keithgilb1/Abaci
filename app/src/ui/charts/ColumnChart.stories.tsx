import type { Meta, StoryObj } from '@storybook/react-vite'
import { pct } from '../../format'
import fx from '../../stories/fixtures.json'
import type { Tone } from './core'
import { ColumnChart } from './ColumnChart'

const v = fx.byVintage
const bestIdx = v.reduce((bi, r, i) => (r.excess_return_vs_treasury > v[bi].excess_return_vs_treasury ? i : bi), 0)
const meta = {
  title: 'Charts/ColumnChart',
  component: ColumnChart,
  args: {
    labels: v.map(r => r.metric_time__year.slice(0, 4)),
    values: v.map(r => r.excess_return_vs_treasury),
    tones: v.map((r, i): Tone => (r.excess_return_vs_treasury < 0 ? 'loss' : i === bestIdx ? 'highlight' : 'main')),
    fmt: x => pct(x, 0),
  },
  argTypes: { fmt: { control: false }, details: { control: false } },
  decorators: [Story => <div className="ab-card" style={{ maxWidth: 640 }}><Story /></div>],
} satisfies Meta<typeof ColumnChart>
export default meta
type Story = StoryObj<typeof meta>

/** Excess return over Treasury by vintage: losses in the warm color, the best year highlighted and labelled. */
export const Vintages: Story = {}
export const AllMain: Story = { args: { tones: undefined } }
/** For long series, label every nth column. */
export const SparseLabels: Story = { args: { labelEvery: 3 } }
export const Empty: Story = { args: { labels: [], values: [] } }
