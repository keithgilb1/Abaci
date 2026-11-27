import type { Preview } from '@storybook/react-vite'
import '../src/ui/ui.css'
import './preview.css'

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    backgrounds: { options: { fog: { name: 'Fog (canvas)', value: '#f0f1f5' }, white: { name: 'Card', value: '#ffffff' } } },
    controls: { expanded: true, sort: 'requiredFirst' },
    a11y: { test: 'error' },
    options: { storySort: { order: ['Introduction', 'Foundations', 'Components', 'Charts', 'Patterns'] } },
  },
  initialGlobals: { backgrounds: { value: 'fog' } },
}
export default preview
