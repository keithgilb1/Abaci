import type { Meta, StoryObj } from '@storybook/react-vite'
import { CodeBlock, Divider, Label, LoadState, Note } from './Text'

const meta = { title: 'Components/Text', component: Note, args: { children: 'Repricing is static: treat it as an upper bound.' } } satisfies Meta<typeof Note>
export default meta
type Story = StoryObj<typeof meta>

export const MutedNote: Story = {}
/** Error notes use the loss color and `role="alert"`. */
export const ErrorNote: Story = { args: { tone: 'error', children: 'Approve at least one grade and one term.' } }
export const FieldLabel: Story = { render: () => <Label>Minimum income</Label> }
export const Code: Story = { render: () => <CodeBlock label="Compiled SQL">{'SELECT loan__grade,\n  SUM(net_profit) / SUM(principal_years) AS net_annualized_return\nFROM loans\nGROUP BY 1'}</CodeBlock> }
export const Rule: Story = { render: () => <div style={{ maxWidth: 320 }}><Note>Above</Note><Divider /><Note>Below</Note></div> }
/** What a page shows while the API answers… */
export const Loading: Story = { render: () => <LoadState /> }
/** …and when it can't. */
export const LoadError: Story = { render: () => <LoadState error="Failed to fetch" hint={<>Is the API running? <code>make api</code></>} /> }
