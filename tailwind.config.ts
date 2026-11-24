import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        notion: {
          bg: 'var(--notion-bg)',
          surface: 'var(--notion-surface)',
          fg: 'var(--notion-fg)',
          'fg-2': 'var(--notion-fg-2)',
          muted: 'var(--notion-muted)',
          meta: 'var(--notion-meta)',
          border: 'var(--notion-border)',
          'border-soft': 'var(--notion-border-soft)',
          accent: 'var(--notion-accent)',
          'accent-on': 'var(--notion-accent-on)',
          'accent-hover': 'var(--notion-accent-hover)',
         success: 'var(--notion-success)',
        warn: 'var(--notion-warn)',
        danger: 'var(--notion-danger)',
        'danger-on': 'var(--notion-danger-on)',
        'danger-hover': 'var(--notion-danger-hover)',
        'badge-bg': 'var(--notion-badge-bg)',
        'badge-fg': 'var(--notion-badge-fg)',
        'success-badge-bg': 'var(--notion-success-badge-bg)',
        'success-badge-fg': 'var(--notion-success-badge-fg)',
        'warn-badge-bg': 'var(--notion-warn-badge-bg)',
        'warn-badge-fg': 'var(--notion-warn-badge-fg)',
        'danger-badge-bg': 'var(--notion-danger-badge-bg)',
        'danger-badge-fg': 'var(--notion-danger-badge-fg)',
        },
      },
      borderRadius: {
        'notion-sm': 'var(--notion-radius-sm)',
        'notion-md': 'var(--notion-radius-md)',
        'notion-lg': 'var(--notion-radius-lg)',
        'notion-pill': 'var(--notion-radius-pill)',
      },
      fontFamily: {
        display: ['var(--notion-font-display)'],
        body: ['var(--notion-font-body)'],
        mono: ['var(--notion-font-mono)'],
      },
      fontSize: {
        'notion-xs': ['var(--notion-text-xs)', { lineHeight: 'var(--notion-leading-body)', letterSpacing: '0.125px' }],
        'notion-sm': ['var(--notion-text-sm)', { lineHeight: 'var(--notion-leading-body)', letterSpacing: 'normal' }],
        'notion-base': ['var(--notion-text-base)', { lineHeight: 'var(--notion-leading-body)', letterSpacing: 'normal' }],
        'notion-lg': ['var(--notion-text-lg)', { lineHeight: '1.4', letterSpacing: '-0.125px' }],
        'notion-xl': ['var(--notion-text-xl)', { lineHeight: '1.23', letterSpacing: '-0.625px' }],
        'notion-2xl': ['var(--notion-text-2xl)', { lineHeight: '1.5', letterSpacing: 'normal' }],
        'notion-3xl': ['var(--notion-text-3xl)', { lineHeight: 'var(--notion-leading-tight)', letterSpacing: '-1.5px' }],
        'notion-4xl': ['var(--notion-text-4xl)', { lineHeight: 'var(--notion-leading-tight)', letterSpacing: 'var(--notion-tracking-display)' }],
      },
      spacing: {
        'notion-1': 'var(--notion-space-1)',
        'notion-2': 'var(--notion-space-2)',
        'notion-3': 'var(--notion-space-3)',
        'notion-4': 'var(--notion-space-4)',
        'notion-5': 'var(--notion-space-5)',
        'notion-6': 'var(--notion-space-6)',
        'notion-8': 'var(--notion-space-8)',
        'notion-12': 'var(--notion-space-12)',
      },
      boxShadow: {
        'notion-flat': 'var(--notion-elev-flat)',
        'notion-ring': 'var(--notion-elev-ring)',
        'notion-raised': 'var(--notion-elev-raised)',
      },
      transitionDuration: {
        'notion-fast': 'var(--notion-motion-fast)',
        'notion-base': 'var(--notion-motion-base)',
      },
      transitionTimingFunction: {
        'notion-ease': 'var(--notion-ease-standard)',
      },
    },
  },
  darkMode: 'class',
  plugins: [require('tailwindcss-animated')],
}
export default config
