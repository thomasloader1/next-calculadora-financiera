import './globals.css'
import 'primeicons/primeicons.css'
import type { Metadata, Viewport } from 'next'
import { Schibsted_Grotesk, Instrument_Sans, DM_Mono } from 'next/font/google'
import { Providers } from "./providers";

const schibsted = Schibsted_Grotesk({ subsets: ['latin'], weight: ['700'], variable: '--font-schibsted', display: 'swap' })
const instrument = Instrument_Sans({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-instrument', display: 'swap' })
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-dm-mono', display: 'swap' })

export const metadata: Metadata = {
  title: 'Calculadora de presupuesto 50/30/20',
  description: 'Calculadora de presupuesto multi-ingreso con split personalizable, transferencias y gastos en USD',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Finanzas 50/30/20',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'oklch(97.6% 0.011 88)' },
    { media: '(prefers-color-scheme: dark)', color: 'oklch(15% 0.01 170)' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es-AR" className={`${schibsted.variable} ${instrument.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-paper text-ink antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
