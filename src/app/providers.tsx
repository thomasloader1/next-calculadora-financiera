'use client'
import { ThemeProvider } from 'next-themes'
import { PrimeReactProvider } from 'primereact/api'
import { ExpenseProvider } from '@/context/Expense/ExpenseContext'
import { AuthProvider } from '@/context/Auth/AuthContext'
import { Toaster } from 'sonner'
import { cdsPT } from '@/lib/primereact-pt'

export function Providers({children}: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" enableSystem defaultTheme="system">
      <PrimeReactProvider value={{ unstyled: true, pt: cdsPT }}>
        <AuthProvider>
          <ExpenseProvider>
            <Toaster position="bottom-right" richColors />
            {children}
          </ExpenseProvider>
        </AuthProvider>
      </PrimeReactProvider>
    </ThemeProvider>
  )
}
