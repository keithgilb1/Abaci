import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  framework: { name: '@storybook/react-vite', options: {} },
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  // Props tables come from the TypeScript types and JSDoc comments on each component.
  typescript: { reactDocgen: 'react-docgen' },
  core: { disableTelemetry: true },
  // GitHub Pages serves the site from /<repo>/, so the build uses relative asset paths.
  viteFinal: async cfg => ({ ...cfg, base: './' }),
}
export default config
