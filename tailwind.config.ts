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
        cds: {
          primary: 'var(--cds-primary)',
          'primary-hover': 'var(--cds-primary-hover)',
          canvas: 'var(--cds-canvas)',
          dark: 'var(--cds-dark)',
          foreground: 'var(--cds-foreground)',
          muted: 'var(--cds-muted)',
          surface: 'var(--cds-surface)',
          'surface-dark': 'var(--cds-surface-dark)',
          'on-primary': 'var(--cds-on-primary)',
          positive: 'var(--cds-positive)',
          negative: 'var(--cds-negative)',
          border: 'var(--cds-border)',
        },
      },
      borderRadius: {
        'cds-sm': '8px',
        'cds-md': '16px',
        'cds-lg': '24px',
        'cds-pill': '100px',
        'cds-full': '9999px',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  darkMode: 'class',
  plugins: [require('tailwindcss-animated')],
}
export default config
