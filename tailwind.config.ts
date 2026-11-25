import type { Config } from 'tailwindcss'

// Every colour is a Hallmark token (src/app/tokens.css). The `.dark` class swaps
// the values, so components never need a `dark:` colour variant.
const token = (name: string) =>
  `color-mix(in oklab, var(--color-${name}) calc(<alpha-value> * 100%), transparent)`

const names = [
  'paper', 'paper-2', 'paper-3', 'surface',
  'ink', 'ink-2', 'muted', 'rule',
  'accent', 'accent-deep', 'accent-soft', 'accent-ink', 'focus',
  'error', 'error-soft',
  'needs', 'needs-soft', 'needs-ink',
  'wants', 'wants-soft', 'wants-ink',
  'savings', 'savings-soft', 'savings-ink',
] as const

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: Object.fromEntries(names.map((n) => [n, token(n)])),
      borderRadius: {
        card: 'var(--radius-card)',
        input: 'var(--radius-input)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-outlier)'],
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
      },
      transitionDuration: {
        micro: 'var(--dur-micro)',
        short: 'var(--dur-short)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
    },
  },
  darkMode: 'class',
  plugins: [require('tailwindcss-animated')],
}
export default config
