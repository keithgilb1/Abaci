import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Tabs } from './Tabs'
import { CodeBlock, Note } from './Text'

const items = [
  { value: 'table', label: 'Table (7 rows)', content: <Note>The rows behind the answer.</Note> },
  { value: 'spec', label: 'Query spec', content: <CodeBlock>{'{\n  "metrics": ["net_annualized_return"],\n  "group_by": ["loan__grade"]\n}'}</CodeBlock> },
  { value: 'sql', label: 'Compiled SQL', content: <CodeBlock>{'SELECT loan__grade, SUM(net_profit) / SUM(principal_years) …'}</CodeBlock> },
]
const meta = {
  title: 'Components/Tabs',
  component: Tabs,
  args: { items, label: 'Answer detail' },
  argTypes: { items: { control: false }, size: { control: 'inline-radio' } },
} satisfies Meta<typeof Tabs>
export default meta
type Story = StoryObj<typeof meta>

/** Use arrow keys to move between tabs once one has focus. */
export const Default: Story = {}
export const Small: Story = { args: { size: 'sm' } }
export const WithDisabledTab: Story = { args: { items: [...items.slice(0, 2), { ...items[2], disabled: true }] } }
export const Controlled: Story = {
  render: function Render(args) {
    const [v, setV] = useState('spec')
    return <><Tabs {...args} value={v} onValueChange={setV} /><Note>Selected: {v}</Note></>
  },
}
