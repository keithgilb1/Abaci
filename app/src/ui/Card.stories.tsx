import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button'
import { Card } from './Card'
import { Note } from './Text'

const meta = {
  title: 'Components/Card',
  component: Card,
  args: {
    title: 'Grade C earned 6.9%, the best of any grade',
    sub: 'Net annualized return by grade. The line is the matched Treasury, 1.0%.',
    children: <Note>Card content goes here: a chart, a table, or a few sentences.</Note>,
  },
  argTypes: { tone: { control: 'inline-radio' }, children: { control: false }, action: { control: false } },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Card>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithTagsAndFoot: Story = {
  args: { tags: ['Mature vintages', 'Net of losses'], foot: 'Return = realized net profit ÷ principal-years outstanding.' },
}
/** A header action sits on the right of the tag row. */
export const WithAction: Story = {
  args: { title: 'Policy', sub: 'Decline anything outside these bars.', action: <Button variant="ghost" size="sm">Reset</Button> },
}
/** The nested tone is a flat Fog surface for content inside a card. Never go deeper than three surfaces. */
export const Nested: Story = {
  render: args => (
    <Card title="Outer card" sub="White on fog with the navy-tinted shadow.">
      <Card {...args} tone="nested" title="Nested" sub="Flat Fog, no shadow." tags={['Inside']} />
    </Card>
  ),
}
export const TitleOnly: Story = { args: { sub: undefined, children: undefined } }
