'use client';

import React from 'react';
import { Tooltip, TooltipContent } from '@/components/ui/Tooltip';
import { formatAmount } from '@/lib/formatAmount';
import { Expense, ExpenseCategory } from '@/interfaces/Expense';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { toast } from 'sonner';

interface ExpenseListProps {
  categoryKey: string;
  label: string;
  expenses: Expense[];
  cash: number;
  poolAmount?: number;
  percent: number;
  onAddExpense?: (category: string) => void;
}

const CATEGORY_THEME: Record<string, { icon: string; textCol: string; bgSoft: string; barCol: string }> = {
  needs: {
    icon: 'pi-home',
    textCol: 'text-[#D46743] dark:text-[#E28669]',
    bgSoft: 'bg-[#FCEEE9] dark:bg-[#301C15] border-[#F4C5B5] dark:border-[#5A2C1D]',
    barCol: 'bg-[#D46743]',
  },
  wants: {
    icon: 'pi-bolt',
    textCol: 'text-[#C47535] dark:text-[#EFA66C]',
    bgSoft: 'bg-[#FDF5EC] dark:bg-[#2D1F13] border-[#F7D2AF] dark:border-[#56361D]',
    barCol: 'bg-[#E89B5B]',
  },
  savings: {
    icon: 'pi-shield',
    textCol: 'text-[#2A8187] dark:text-[#BFE7EA]',
    bgSoft: 'bg-[#EDF9FA] dark:bg-[#132426] border-[#BFE7EA] dark:border-[#1E373A]',
    barCol: 'bg-[#3DA6AD]',
  },
};

const CATEGORY_INFO: Record<string, React.ReactNode> = {
  needs: (
    <TooltipContent
      title="Necesidades fijas (50%)"
      description="Gastos obligatorios e indispensables para vivir: vivienda, alimentación, salud, servicios y transporte."
      example="Alquiler $120.000 · Supermercado $65.000 · Luz $12.000 · Internet $15.000"
    />
  ),
  wants: (
    <TooltipContent
      title="Imprevistos y Deseos (30%)"
      description="Fondo para gastos discrecionales, entretenimiento, salidas o emergencias puntuales."
      example="Cena con amigos $18.000 · Arreglo del auto $25.000 · Ropa $20.000"
    />
  ),
  savings: (
    <TooltipContent
      title="Ahorro e Inversión (20%)"
      description="Capital que se aparta para el futuro, fondo de emergencia o instrumentos de inversión."
      example="Fondo de emergencia $30.000 · Plazo Fijo / FCI $40.000 · Dólares $25.000"
    />
  ),
};

const ExpenseList: React.FC<ExpenseListProps> = ({
  categoryKey,
  label,
  expenses,
  cash,
  poolAmount,
  percent,
  onAddExpense,
}) => {
  const { deleteExpense, addExpenseToCategory } = useExpenseContext();
  const theme = CATEGORY_THEME[categoryKey] || CATEGORY_THEME.needs;

  const remaining = cash ?? 0;
  const isNegative = remaining < 0;

  const transferExpenses = expenses.filter(e => e.isTransfer);
  const regularExpenses = expenses.filter(e => !e.isTransfer);

  const spent = regularExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalAllocated = poolAmount ?? (spent + remaining);
  const progressPercent = totalAllocated > 0
    ? Math.min(100, Math.max(0, Math.round((spent / totalAllocated) * 100)))
    : 0;

  const handleDeleteExpense = (expense: Expense) => {
    deleteExpense(categoryKey, expense.id);
    toast('Gasto eliminado', {
      description: `${expense.description} (${formatAmount(expense.amount)})`,
      action: {
        label: 'Deshacer',
        onClick: () => {
          addExpenseToCategory(categoryKey as ExpenseCategory, expense);
          toast.success('Gasto restaurado');
        },
      },
    });
  };

  return (
    <div
      className={`calm-card flex flex-col justify-between overflow-hidden transition-all ${
        isNegative ? 'ring-1 ring-[#B44C4C]/40 border-[#B44C4C]/30' : ''
      }`}
    >
      <div>
        {/* Header with Title and Icon */}
        <div className="p-5 sm:p-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border ${theme.bgSoft} ${theme.textCol} shadow-2xs`}>
                <i className={`pi ${theme.icon}`}></i>
              </span>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-[#232B25] dark:text-white tracking-tight">
                  {label}
                </h2>
                <Tooltip content={CATEGORY_INFO[categoryKey]} />
              </div>
            </div>

            <span
              className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                isNegative
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-600 border-red-200 dark:border-red-900/50'
                  : `${theme.bgSoft} ${theme.textCol}`
              }`}
            >
              {percent}%
            </span>
          </div>

          {/* Balance display */}
          <div className="space-y-2 mt-4">
            <div className="flex items-baseline justify-between">
              <span
                className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight ${
                  isNegative ? 'text-[#B44C4C]' : 'text-[#232B25] dark:text-white'
                }`}
              >
                {formatAmount(remaining)}
              </span>
             
            </div>

            {/* Micro Progress Bar matching Item 07 in CALM / KIT study */}
            <div className="calm-progress-track">
              <div
                className={`calm-progress-fill ${
                  isNegative
                    ? 'bg-[#B44C4C]'
                    : progressPercent > 90
                    ? 'bg-[#B88344]'
                    : theme.barCol
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#5F6F63] dark:text-[#A3B4A5] font-mono pt-0.5">
              <span>Gastado: {formatAmount(spent)}</span>
              <span>Total: {formatAmount(totalAllocated)}</span>
            </div>
          </div>
        </div>

        {/* Warning if overspent */}
        {isNegative && (
          <div className="mx-5 mb-3 px-3.5 py-2 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-[#B44C4C] text-xs flex items-center gap-2">
            <i className="pi pi-exclamation-circle text-xs shrink-0"></i>
            <span>Excedido por {formatAmount(Math.abs(remaining))}</span>
          </div>
        )}

        <hr className="border-[#E8E2D8] dark:border-[#2A362D]" />

        {/* Expenses List */}
        <div className="p-4 sm:p-5 space-y-2 min-h-[120px]">
          {expenses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-[#8A9A8E] text-xs">
              <i className="pi pi-inbox text-xl mb-1.5 opacity-60"></i>
              <span>Sin gastos registrados</span>
            </div>
          )}

          {/* Transfers into/out of category */}
          {transferExpenses.map(expense => (
            <div
              key={expense.id}
              className="flex items-center justify-between px-3 py-2 rounded-2xl bg-[#FFEAD3]/50 dark:bg-[#201914]/60 border border-[#F0D7BC] dark:border-[#3A2E25] text-[#6B5547] text-xs font-mono"
            >
              <div className="flex items-center gap-1.5 truncate">
                <i className="pi pi-exchange-alt text-[10px] text-[#D46743]"></i>
                <span className="truncate">{expense.description}</span>
              </div>
              <span className="font-semibold tabular-nums shrink-0 ml-2">
                {formatAmount(expense.amount)}
              </span>
            </div>
          ))}

          {/* Regular Expenses */}
          {regularExpenses.map(expense => (
            <div
              key={expense.id}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#FAF6F0] dark:bg-[#1A1410] border border-[#F0D7BC]/60 dark:border-[#3A2E25]/60 hover:border-[#D46743]/40 transition-all group"
            >
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-xs font-medium text-[#2C211B] dark:text-[#FDF6F0] truncate">
                  {expense.description}
                </span>
                {expense.currency === 'USD' && expense.originalAmount && (
                  <span className="text-[10px] text-[#6B5547] dark:text-[#C4B1A3] font-mono">
                    USD {expense.originalAmount} × ${expense.exchangeRate?.toLocaleString('es-AR')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold font-mono tabular-nums text-[#2C211B] dark:text-white">
                  {formatAmount(expense.amount)}
                </span>
                {/* Delete button: always visible or clear on mobile */}
                <button
                  type="button"
                  onClick={() => handleDeleteExpense(expense)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[#9E8575] hover:text-[#D46743] hover:bg-[#D46743]/10 transition-colors cursor-pointer"
                  title="Eliminar gasto"
                  aria-label={`Eliminar gasto ${expense.description}`}
                >
                  <i className="pi pi-trash text-[11px]"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Add Expense Button */}
      {onAddExpense && (
        <div className="p-4 bg-[#FFEAD3]/40 dark:bg-[#1A1410]/40 border-t border-[#F0D7BC] dark:border-[#3A2E25]">
          <button
            type="button"
            onClick={() => onAddExpense(categoryKey)}
            className="w-full py-2.5 px-4 rounded-full border border-dashed border-[#F0D7BC] dark:border-[#3A2E25] hover:border-[#D46743] dark:hover:border-[#E28669] text-xs font-semibold text-[#6B5547] dark:text-[#C4B1A3] hover:text-[#2C211B] dark:hover:text-white hover:bg-white dark:hover:bg-[#261F1A] transition-all flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <i className="pi pi-plus text-xs text-[#D46743]"></i>
              <span>Cargar gasto</span>
            </span>
            
          </button>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
