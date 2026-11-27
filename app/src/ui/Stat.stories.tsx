import type { Meta, StoryObj } from '@storybook/react-vite'
import { Grid } from './Grid'
import { Callout, Stat } from './Stat'

const meta = {
  title: 'Components/Stat',
  component: Stat,
  args: { label: 'Net annualized return', value: '6.57%', delta: 'after 8.4% net charge-offs' },
  decorators: [Story => <div style={{ maxWidth: 280 }}><Story /></div>],
} satisfies Meta<typeof Stat>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const NoDelta: Story = { args: { delta: undefined } }
/** Negative numbers use a true minus sign (−), not a hyphen. */
export const Negative: Story = { args: { label: 'Net return', value: '−1.43%', delta: '−8.00 pts vs today' } }

/** The standard top row: three Stats and one Voltage callout for the headline number. */
export const KpiRow: Story = {
  decorators: [Story => <div style={{ maxWidth: 1200 }}><Story /></div>],
  render: () => (
    <Grid cols={4}>
      <Stat label="Mature loans" value="785,915" delta="$10.4B funded, 2007–2016" />
      <Stat label="Net annualized return" value="6.57%" delta="after 8.4% net charge-offs" />
      <Stat label="Charge-off rate" value="15.2%" delta="of resolved loans" />
      <Callout label="Realized net profit" value="$926M">Cash back minus cash out, on loans whose full term has ended.</Callout>
    </Grid>
  ),
}
