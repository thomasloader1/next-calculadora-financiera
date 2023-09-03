'use client'
import { config } from 'dotenv';

config();
import { ExpenseProvider } from '@/context/Expense/ExpenseContext'
import {NextUIProvider} from '@nextui-org/react'

export function Providers({children}: { children: React.ReactNode }) {
  return (
    <ExpenseProvider>
    <NextUIProvider>
      {children}
    </NextUIProvider>
    </ExpenseProvider>
  )
}