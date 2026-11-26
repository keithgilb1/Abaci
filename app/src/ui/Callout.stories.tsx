import type { Meta, StoryObj } from '@storybook/react-vite'
import { Callout } from './Stat'

const meta = {
  title: 'Components/Callout',
  component: Callout,
  args: { label: 'Realized net profit', value: '$926M', children: 'Cash back minus cash out, on loans whose full term has ended.' },
  decorators: [Story => <div style={{ maxWidth: 300 }}><Story /></div>],
} satisfies Meta<typeof Callout>
export default meta
type Story = StoryObj<typeof meta>

/** Voltage Yellow is reserved for ONE number per page. Text on it is Abyss. */
export const Default: Story = {}
export const Negative: Story = { args: { label: 'E–G return, 2016 vintage', value: '−1.4%', children: 'Down from 7.9% for the 2012 vintage.' } }
export const ValueOnly: Story = { args: { children: undefined } }
