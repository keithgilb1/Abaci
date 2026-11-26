import type { Meta, StoryObj } from '@storybook/react-vite'
import { pct, usd } from '../../format'
import fx from '../../stories/fixtures.json'
import { FrontierChart } from './FrontierChart'

const f = fx.frontier
const meta = {
  title: 'Charts/FrontierChart',
  component: FrontierChart,
  args: {
    points: f.map(x => ({ x: x.share_of_originations, y: x.net_annualized_return })),
    current: { x: 1, y: fx.portfolio.net_annualized_return },
    fmtX: v => pct(v, 0),
    fmtY: v => pct(v, 1),
    labelFor: i => `FICO ${f[i].min_fico}: ${pct(f[i].net_annualized_return, 2)} return, ${pct(f[i].share_of_originations, 0)} of lending, ${usd(f[i].realized_net_profit)} profit`,
  },
  argTypes: { fmtX: { control: false }, fmtY: { control: false }, labelFor: { control: false } },
  decorators: [Story => <div className="ab-card" style={{ maxWidth: 720 }}><Story /></div>],
} satisfies Meta<typeof FrontierChart>
export default meta
type Story = StoryObj<typeof meta>

/** The Policy Lab's FICO-floor sweep on the real loan book: each dot is a floor, the blue dot is today's policy. */
export const FicoSweep: Story = {}
export const WithoutCurrent: Story = { args: { current: undefined } }
export const Empty: Story = { args: { points: [], current: undefined } }
