import React, { useMemo } from 'react';
import { Chip } from '@/components/ui/Chip';
import { Tooltip, TooltipContent } from '@/components/ui/Tooltip';
import { formatAmount, formatUsdAmount } from '@/lib/formatAmount';
import { Expense } from '@/interfaces/Expense';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';

interface ExpenseListProps {
  categoryKey: string;
  label: string;
  expenses: Expense[];
  cash: number;
  percent: number;
  onAddExpense?: (category: string) => void;
}

const chipColorForCategory: Record<string, 'success' | 'primary' | 'warning'> = {
  needs: 'primary',
  wants: 'warning',
  savings: 'success',
};

const CATEGORY_INFO: Record<string, React.ReactNode> = {
  needs: (
    <TooltipContent
      title="Necesidades fijas"
      description="Gastos obligatorios del mes: vivienda, comida, servicios, transporte."
      example="Alquiler $80.000 · Supermercado $45.000 · Luz $8.000 · Gas $3.500"
    />
  ),
  wants: (
    <TooltipContent
      title="Imprevistos"
      description="Fondo para gastos inesperados o emergencias que puedan aparecer."
      example="Reparación del auto $25.000 · Urgencia médica $15.000"
    />
  ),
  savings: (
    <TooltipContent
      title="Ahorro"
      description="Plata que queda guardada para metas a futuro o inversiones."
      example="Vacaciones $50.000 · Fondo de emergencia · Inversión $20.000"
    />
  ),
};

const ExpenseList: React.FC<ExpenseListProps> = ({ categoryKey, label, expenses, cash, percent, onAddExpense }) => {
  const { deleteExpense } = useExpenseContext();
  const chipColor = chipColorForCategory[categoryKey] || 'primary';

  const remaining = useMemo(
    () => (cash || 0) - expenses.reduce((sum, e) => sum + e.amount, 0),
    [cash, expenses]
  );

  const isNegative = remaining < 0;
  const transferExpenses = expenses.filter(e => e.isTransfer);
  const regularExpenses = expenses.filter(e => !e.isTransfer);

  const expenseLabel = (e: Expense) => {
    if (e.currency === 'USD' && e.originalAmount && e.exchangeRate) {
      return `${formatAmount(e.amount)} (${formatUsdAmount(e.originalAmount)} × $${e.exchangeRate.toLocaleString('es-AR')})`
    }
    return formatAmount(e.amount)
  }

  return (
    <div className={`border rounded-cds-lg bg-cds-surface shadow-none ${isNegative ? 'border-cds-negative/50' : 'border-cds-border'}`}>
      <div className="grid grid-cols-[48px_1fr_auto] gap-3 items-center px-4 py-3">
        <div className={`text-cds-on-primary font-bold rounded-cds-sm w-12 h-12 flex items-center justify-center text-sm ${isNegative ? 'bg-cds-negative' : 'bg-cds-primary'}`}>
          <span>{percent}%</span>
        </div>
        <div className="flex justify-between w-full items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-cds-foreground">{label}</h2>
            <Tooltip content={CATEGORY_INFO[categoryKey]} />
          </div>
          <Chip color={isNegative ? 'danger' : chipColor}>
            {formatAmount(remaining)}
          </Chip>
        </div>
      </div>
      <hr className="bg-cds-border border-0 h-px" />
      <div className="gap-2 px-4 py-3">
        {expenses.length === 0 && (
          <p className="text-cds-muted text-xs">Sin gastos registrados</p>
        )}

        {isNegative && (
          <p className="text-cds-negative text-xs font-semibold mb-1">
            Saldo negativo: te excediste por {formatAmount(Math.abs(remaining))}
          </p>
        )}

        {/* Transfer expenses — distinct styling, no delete */}
        {transferExpenses.map((expense) => (
          <Chip
            key={expense.id}
            color="default"
            className="opacity-75 italic"
          >
            <i className="pi pi-exchange-alt text-[10px] mr-1"></i>
            {formatAmount(expense.amount)} — {expense.description}
          </Chip>
        ))}

        {/* Regular expenses — with delete */}
        {regularExpenses.map((expense) => (
          <Chip
            key={expense.id}
            color={chipColor}
            onClose={() => deleteExpense(categoryKey, expense.id)}
          >
            {expense.currency === 'USD' && <i className="pi pi-dollar text-[10px] mr-0.5"></i>}
            {expenseLabel(expense)} — {expense.description}
          </Chip>
        ))}
      </div>

      {/* Add expense button */}
      {onAddExpense && (
        <>
          <hr className="bg-cds-border border-0 h-px" />
          <div className="px-4 py-2">
            <button
              onClick={() => onAddExpense(categoryKey)}
              className="flex items-center gap-1.5 text-xs text-cds-muted hover:text-cds-foreground transition-colors"
            >
              <i className="pi pi-plus text-[10px]"></i>
              Agregar gasto
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ExpenseList;
