import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { SegmentedControl } from './SegmentedControl'

const GRADES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(value => ({ value }))
const meta = {
  title: 'Components/SegmentedControl',
  component: SegmentedControl,
  args: { type: 'multiple', label: 'Grades approved', options: GRADES, value: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], onValueChange: fn() },
  // Stories keep their own state so you can click them.
  render: function Render(args) {
    const [value, setValue] = useState(args.value)
    const onValueChange = (v: string | string[]) => { setValue(v as never); (args.onValueChange as (v: unknown) => void)(v) }
    return <SegmentedControl {...args} value={value as never} onValueChange={onValueChange as never} />
  },
} satisfies Meta<typeof SegmentedControl>
export default meta
type Story = StoryObj<typeof meta>

/** Any number of segments can be on. The order of the value always follows the options. */
export const Multiple: Story = {}
export const SomeOff: Story = { args: { value: ['A', 'B', 'C'] } }
/** Nothing selected is a valid state; the page decides whether it's an error. */
export const NoneSelected: Story = { args: { value: [] } }
/** Exactly one segment is on; clicking the active one does nothing. */
export const Single: Story = {
  args: { type: 'single', label: 'Term', options: [{ value: '36', label: '36 mo' }, { value: '60', label: '60 mo' }], value: '36' },
}
export const Disabled: Story = { args: { disabled: true } }
export const OneOptionDisabled: Story = { args: { options: GRADES.map(g => ({ ...g, disabled: g.value === 'G' })) } }
