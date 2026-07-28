'use client';
import React, { useEffect, useState } from 'react';
import ExpenseList from './ExpenseList';
import IncomeForm from './IncomeForm';
import IncomeList from './IncomeList';
import SplitEditor from './SplitEditor';
import TransferList from './TransferList';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import dynamic from 'next/dynamic';
import IncomeFormModal from './IncomeForm';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { useAuthContext } from '@/context/Auth/AuthContext';
import { calculateEffectivePercentages } from '@/lib/budgetCalculator';
import { ExcelButtons } from './ExcelButtons';

const LazyExpenseModal = dynamic(() => import('./ExpenseModal'), { ssr: false });

const CATEGORY_LABELS: Record<string, string> = {
  needs: 'Necesidad',
  wants: 'Imprevistos',
  savings: 'Ahorro',
};

const Calculator: React.FC = () => {
  const {
    needs, wants, savings, cash,
    incomes, transfers, globalSplit,
    recalculateBudgets, isLoading,
  } = useExpenseContext();
  const { user } = useAuthContext();
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseModalCategory, setExpenseModalCategory] = useState<string>('');
  const [expenseModalTab, setExpenseModalTab] = useState<'gastos' | 'transferencias'>('gastos');

  useEffect(() => {
    if (incomes.length > 0) {
      recalculateBudgets();
    }
  }, [incomes, globalSplit, recalculateBudgets]);

  const hasIncomes = incomes.length > 0;
  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const effectivePercent = cash
    ? calculateEffectivePercentages(cash, totalIncome)
    : globalSplit;

  const handleAddExpense = (category: string) => {
    setExpenseModalCategory(category);
    setExpenseModalTab('gastos');
    setShowExpenseModal(true);
  };

  const handleOpenTransfers = () => {
    setExpenseModalCategory('');
    setExpenseModalTab('transferencias');
    setShowExpenseModal(true);
  };

  return (
    <>
      {/* Income section */}
      <section className="mb-6">
        {!hasIncomes ? (
          <IncomeForm />
        ) : (
          <div className="border border-cds-border rounded-cds-lg bg-cds-surface">
            <div className="px-4 py-3 border-b border-cds-border">
              <IncomeList />
            </div>
            <div className="px-4 py-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowIncomeModal(true)}
                startContent={<i className="pi pi-plus text-xs"></i>}
                className="w-full justify-start text-cds-muted hover:text-cds-foreground"
              >
                Agregar ingreso
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Income modal */}
      <Modal
        isOpen={showIncomeModal}
        onClose={() => setShowIncomeModal(false)}
        title="Agregar ingreso"
      >
        <IncomeFormModal onAdded={() => setShowIncomeModal(false)} />
      </Modal>

      {/* Split + Transfers link */}
      {cash && !isLoading && (
        <section className="space-y-4 mb-6">
          <SplitEditor />
          <button
            onClick={handleOpenTransfers}
            className="text-xs text-cds-muted hover:text-cds-foreground transition-colors"
          >
            Transferencias →
          </button>
        </section>
      )}

      {/* Skeleton while loading month data */}
      {cash && isLoading && (
        <section className="space-y-4 mb-6">
          <div className="border border-cds-border rounded-cds-lg bg-cds-surface p-4">
            <div className="h-4 w-32 bg-cds-surface-dark rounded animate-pulse mb-3" />
            <div className="h-3 w-full bg-cds-surface-dark rounded animate-pulse mb-2" />
            <div className="h-3 w-3/4 bg-cds-surface-dark rounded animate-pulse" />
          </div>
          <div className="border border-cds-border rounded-cds-lg bg-cds-surface p-4">
            <div className="h-4 w-28 bg-cds-surface-dark rounded animate-pulse mb-3" />
            <div className="h-3 w-full bg-cds-surface-dark rounded animate-pulse mb-2" />
            <div className="h-3 w-2/3 bg-cds-surface-dark rounded animate-pulse" />
          </div>
        </section>
      )}

      {/* Expense lists */}
      {cash && !isLoading && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <ExpenseList
            categoryKey="needs"
            label={CATEGORY_LABELS.needs}
            expenses={needs}
            cash={cash.needs}
            percent={effectivePercent.needs}
            onAddExpense={handleAddExpense}
          />
          <ExpenseList
            categoryKey="wants"
            label={CATEGORY_LABELS.wants}
            expenses={wants}
            cash={cash.wants}
            percent={effectivePercent.wants}
            onAddExpense={handleAddExpense}
          />
          <ExpenseList
            categoryKey="savings"
            label={CATEGORY_LABELS.savings}
            expenses={savings}
            cash={cash.savings}
            percent={effectivePercent.savings}
            onAddExpense={handleAddExpense}
          />
        </section>
      )}

      {/* Skeleton for expense lists while loading */}
      {cash && isLoading && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="border border-cds-border rounded-cds-lg bg-cds-surface p-4">
              <div className="h-4 w-24 bg-cds-surface-dark rounded animate-pulse mb-3" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-cds-surface-dark rounded animate-pulse" />
                <div className="h-3 w-4/5 bg-cds-surface-dark rounded animate-pulse" />
                <div className="h-3 w-3/5 bg-cds-surface-dark rounded animate-pulse" />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Transfers */}
      {cash && <TransferList />}

      {/* Excel Import — always visible */}
      <div className="flex justify-end mb-4">
        <ExcelButtons showExport={!!cash && !isLoading} />
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-cds-border text-center">
        <p className="text-xs text-cds-muted">
          Hecho por Gomez Tomas Gonzalo
        </p>
      </footer>

      {/* Expense/Transfer Modal */}
      <LazyExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        defaultCategory={expenseModalCategory}
        defaultTab={expenseModalTab}
      />
    </>
  );
};

export default Calculator;
