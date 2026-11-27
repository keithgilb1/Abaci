import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { Slider } from './Slider'

const meta = {
  title: 'Components/Slider',
  component: Slider,
  args: { label: 'Minimum FICO', min: 640, max: 800, step: 5, value: 700, display: '700', onValueChange: fn() },
  decorators: [Story => <div style={{ maxWidth: 320 }}><Story /></div>],
  render: function Render(args) {
    const [v, setV] = useState(args.value)
    return <Slider {...args} value={v} display={v <= args.min ? 'No floor' : String(v)} onValueChange={x => { setV(x); args.onValueChange(x) }} />
  },
} satisfies Meta<typeof Slider>
export default meta
type Story = StoryObj<typeof meta>

/** Drag, or focus the thumb and use the arrow keys. Screen readers hear the `display` text. */
export const Default: Story = {}
/** The left end means "off". The label says so instead of showing 640. */
export const AtMinimum: Story = { args: { value: 640, display: 'No floor' } }
export const AtMaximum: Story = { args: { value: 800, display: '800' } }
export const Disabled: Story = { args: { disabled: true } }
