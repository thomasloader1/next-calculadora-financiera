import './globals.css'
import 'primeicons/primeicons.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from "./providers";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Calculadora de gastos',
  description: 'Calculadora de presupuesto multi-ingreso con split personalizable, transferencias y gastos en USD',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es-AR" className={inter.variable} suppressHydrationWarning>
      <body className={inter.className + " min-h-screen bg-cds-canvas antialiased"}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
