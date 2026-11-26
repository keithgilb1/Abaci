import { addons } from 'storybook/manager-api'
import { create } from 'storybook/theming'

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Abaci UI · Fold design system',
    brandUrl: 'https://github.com/keithgilb1/Abaci',
    fontBase: 'Inter, ui-sans-serif, system-ui, sans-serif',
    colorPrimary: '#20294c',
    colorSecondary: '#459af8',
    appBg: '#f0f1f5',
    appContentBg: '#ffffff',
    appBorderRadius: 12,
    textColor: '#20294c',
    barSelectedColor: '#459af8',
  }),
})
