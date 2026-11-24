import './globals.css'
import 'primeicons/primeicons.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from "./providers";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

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
    { media: '(prefers-color-scheme: light)', color: '#FAF6F0' },
    { media: '(prefers-color-scheme: dark)', color: '#15110E' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es-AR" className={inter.variable} suppressHydrationWarning>
      <body className={inter.className + " min-h-screen bg-notion-bg antialiased"}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
