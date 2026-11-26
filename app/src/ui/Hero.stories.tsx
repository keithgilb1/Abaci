import type { Meta, StoryObj } from '@storybook/react-vite'
import { Hero } from './Hero'

const meta = {
  title: 'Components/Hero',
  component: Hero,
  args: {
    eyebrow: 'Question 1 · Which loans actually make us money?',
    title: 'Every grade made money. Grade C made the most.',
    sub: 'On $10.4B of mature loans Abaci earned 6.6% a year after every charge-off, $926M in all.',
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Hero>
export default meta
type Story = StoryObj<typeof meta>

/** Each page opens with ONE poster headline that states the finding, then one Dusk sentence. */
export const Default: Story = {}
export const ShortFinding: Story = { args: { eyebrow: 'Question 2 · Are we pricing risk correctly?', title: 'Grades E–G written in 2016 lost money.', sub: undefined } }
