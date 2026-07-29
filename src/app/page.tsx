"use client"
import Navbar from '@/components/Navbar'
import Calculator from '@/components/Calculator'
import { useExpenseContext } from '@/context/Expense/ExpenseContext'
import SplitEditor from '@/components/SplitEditor';

export default function Home() {
  const { globalSplit, cash, isLoading } = useExpenseContext();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 items-center">
          <h1 className="text-lg font-semibold text-cds-foreground tracking-tight">
            Gastos ({globalSplit.needs}/{globalSplit.wants}/{globalSplit.savings})
          </h1>
          {/* Split + Transfers link */}
          {cash && !isLoading && (<SplitEditor />)}
        </div>
        <Calculator />
      </main>
    </div>
  )
}
