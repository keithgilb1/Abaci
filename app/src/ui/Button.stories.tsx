import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { Button } from './Button'

const meta = {
  title: 'Components/Button',
  component: Button,
  args: { children: 'Ask', onClick: fn() },
  argTypes: { variant: { control: 'inline-radio' }, size: { control: 'inline-radio' } },
} satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>

/** The primary action on a screen. Navy pill, white 16/600 text, the small navy shadow. */
export const Filled: Story = { args: { variant: 'filled' } }
/** Secondary actions such as Reset. Cornflower outline, no fill. */
export const Ghost: Story = { args: { variant: 'ghost', children: 'Reset' } }
/** Suggested questions under the Ask box. Hyacinth outline that turns Electric Blue on hover. */
export const Chip: Story = { args: { variant: 'chip', children: 'Which grade made us the most money per dollar lent?' } }
/** Inline text actions. */
export const Link: Story = { args: { variant: 'link', children: 'Show compiled SQL' } }
export const Small: Story = { args: { variant: 'ghost', size: 'sm', children: 'Reset' } }
export const Disabled: Story = { args: { disabled: true, children: 'Thinking…' } }

export const AllVariants: Story = {
  render: args => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <Button {...args} variant="filled">Filled</Button>
      <Button {...args} variant="ghost">Ghost</Button>
      <Button {...args} variant="chip">Chip</Button>
      <Button {...args} variant="link">Link</Button>
      <Button {...args} variant="filled" disabled>Disabled</Button>
    </div>
  ),
}
