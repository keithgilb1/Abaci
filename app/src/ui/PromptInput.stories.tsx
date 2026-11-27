import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { fn } from 'storybook/test'
import { PromptInput } from './PromptInput'

const meta = {
  title: 'Components/PromptInput',
  component: PromptInput,
  args: { value: '', placeholder: 'e.g. Which grade made us the most money per dollar lent?', onValueChange: fn(), onSubmit: fn() },
  render: function Render(args) {
    const [v, setV] = useState(args.value)
    return <PromptInput {...args} value={v} onValueChange={x => { setV(x); args.onValueChange(x) }} />
  },
} satisfies Meta<typeof PromptInput>
export default meta
type Story = StoryObj<typeof meta>

/** The button stays disabled until there is a question. */
export const Empty: Story = {}
export const WithQuestion: Story = { args: { value: 'How did the 2016 vintage do by grade?' } }
export const Busy: Story = { args: { value: 'How did the 2016 vintage do by grade?', busy: true } }
