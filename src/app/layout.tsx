import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import {Providers} from "./providers";
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Calculadora financiera',
  description: 'Calculadora que te permite saber que montos son destinados para ahorros, imprevisto y necesidades',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
        </body>
    </html>
  )
}
