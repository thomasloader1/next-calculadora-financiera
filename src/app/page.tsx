"use client"
import Navbar from '@/components/Navbar'
import Calculator from '@/components/Calculator'
import { useExpenseContext } from '@/context/Expense/ExpenseContext'

export default function Home() {
  const { globalSplit } = useExpenseContext();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-lg font-semibold text-cds-foreground tracking-tight">
            Gastos ({globalSplit.needs}/{globalSplit.wants}/{globalSplit.savings})
          </h1>
          <p className="text-sm text-cds-muted mt-0.5">Distribuí tu ingreso en categorías</p>
        </div>
        <Calculator />
      </main>
    </div>
  )
}
