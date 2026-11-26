import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card } from './Card'
import { Grid } from './Grid'

const cell = (i: number) => <Card key={i} title={`Card ${i + 1}`} sub="24px gutters on the 8px grid." />
const meta = {
  title: 'Components/Grid',
  component: Grid,
  args: { cols: 2, children: [0, 1].map(cell) },
  argTypes: { cols: { control: 'inline-radio', options: [1, 2, 3, 4, 'sidebar'] }, spaced: { control: 'inline-radio' }, children: { control: false } },
} satisfies Meta<typeof Grid>
export default meta
type Story = StoryObj<typeof meta>

/** Every layout collapses to one column under 900px; try the viewport toolbar. */
export const TwoUp: Story = {}
export const FourUp: Story = { args: { cols: 4, children: [0, 1, 2, 3].map(cell) } }
/** 360px controls on the left, results on the right: the Policy Lab layout. */
export const Sidebar: Story = { args: { cols: 'sidebar', children: [0, 1].map(cell) } }
