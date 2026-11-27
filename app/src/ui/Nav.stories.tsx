import type { Meta, StoryObj } from '@storybook/react-vite'
import { Nav } from './Nav'

const items = [
  { id: 'overview', label: 'Overview', href: '#overview' },
  { id: 'pricing', label: 'Pricing', href: '#pricing' },
  { id: 'lab', label: 'Policy Lab', href: '#lab' },
  { id: 'treasury', label: 'vs Treasury', href: '#treasury' },
  { id: 'ask', label: 'Ask Abaci', href: '#ask' },
]
const meta = {
  title: 'Components/Nav',
  component: Nav,
  args: { brand: 'Abaci', items, activeId: 'overview' },
  argTypes: { activeId: { control: 'inline-radio', options: items.map(i => i.id) } },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Nav>
export default meta
type Story = StoryObj<typeof meta>

/** The active link is Electric Blue on a white pill and carries `aria-current="page"`. */
export const Overview: Story = {}
export const PolicyLab: Story = { args: { activeId: 'lab' } }
