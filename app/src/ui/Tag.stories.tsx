import type { Meta, StoryObj } from '@storybook/react-vite'
import { Tag, TagList } from './Tag'

const meta = { title: 'Components/Tag', component: Tag, args: { children: 'Grade C' } } satisfies Meta<typeof Tag>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
/** Tags sit in a row above a card title and wrap when they run out of room. */
export const Row: Story = { render: () => <TagList tags={['Mature vintages', 'Net of losses', '60 mo', 'Debt consolidation']} /> }
