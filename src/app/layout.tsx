import './globals.css'
import 'sweetalert2/src/sweetalert2.scss'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import {Providers} from "./providers";
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Calculadora de gastos (50/30/20)',
  description: 'Calculadora que te permite saber que montos son destinados para ahorros, imprevisto y necesidades aplicando el 50 / 30 / 20',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className + " container mx-auto mt-20"}>
        <Providers>
          {children}
        </Providers>
        </body>
    </html>
  )
}
