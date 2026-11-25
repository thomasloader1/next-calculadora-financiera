'use client';

import React from 'react';
import { Tooltip, TooltipContent } from '@/components/ui/Tooltip';
import { VolumeKnob, type KnobVariant } from '@/components/ui/VolumeKnob';
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
  onPercentChange?: (newPercent: number) => void;
  onAddExpense?: (category: string) => void;
}

const CATEGORY_THEME: Record<string, { icon: string; plastic: string; ink: string; bar: string }> = {
  needs: { icon: 'pi-home', plastic: 'plastic--needs', ink: 'text-needs-ink', bar: 'bg-needs-ink' },
  wants: { icon: 'pi-bolt', plastic: 'plastic--wants', ink: 'text-wants-ink', bar: 'bg-wants-ink' },
  savings: { icon: 'pi-shield', plastic: 'plastic--savings', ink: 'text-savings-ink', bar: 'bg-savings-ink' },
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
  onPercentChange,
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
    <section
      aria-label={label}
      className={`calm-card flex flex-col overflow-hidden ${isNegative ? 'border-error/50' : ''}`}
    >
      {/* The compartment: tinted plastic holding what is left of this bucket */}
      <div className={`plastic ${theme.plastic} m-2 p-4 sm:p-5`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <i className={`pi ${theme.icon} text-sm ${theme.ink}`} aria-hidden="true"></i>
            <h2 className="text-base text-ink truncate">{label}</h2>
            <Tooltip content={CATEGORY_INFO[categoryKey]} />
          </div>
          {onPercentChange ? (
            <VolumeKnob
              value={percent}
              onChange={onPercentChange}
              label={label}
              variant={(categoryKey as KnobVariant) || 'needs'}
            />
          ) : (
            <span className={`text-sm font-medium tabular-nums ${theme.ink}`}>{percent}%</span>
          )}
        </div>

        <p className="mt-4 text-sm text-ink-2">{isNegative ? 'Excedido' : 'Disponible'}</p>
        <p
          className={`font-display font-bold text-3xl leading-none tracking-tight ${
            isNegative ? 'text-error' : 'text-ink'
          }`}
        >
          {formatAmount(remaining)}
        </p>

        <div
          className="mt-4 h-2 rounded-full bg-surface/70 overflow-hidden"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${progressPercent}% gastado`}
        >
          <div
            className={`h-full rounded-full ${isNegative ? 'bg-error' : theme.bar}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-sm text-ink-2 tabular-nums">
          <span>Gastado {formatAmount(spent)}</span>
          <span>de {formatAmount(totalAllocated)}</span>
        </div>
      </div>

      {/* Movements */}
      <div className="flex-1 px-4 sm:px-5 py-2 min-h-[96px]">
        {expenses.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">Todavía no hay gastos en {label.toLowerCase()}.</p>
        )}

        <ul className="divide-y divide-rule">
          {transferExpenses.map(expense => (
            <li key={expense.id} className="flex items-center justify-between gap-2 py-2.5 text-sm text-muted">
              <span className="flex items-center gap-2 min-w-0">
                <i className="pi pi-exchange-alt text-xs" aria-hidden="true"></i>
                <span className="truncate">{expense.description}</span>
              </span>
              <span className="tabular-nums shrink-0">{formatAmount(expense.amount)}</span>
            </li>
          ))}

          {regularExpenses.map(expense => (
            <li key={expense.id} className="group flex items-center justify-between gap-2 py-2">
              <div className="flex flex-col min-w-0">
                <span className="text-sm text-ink truncate">{expense.description}</span>
                {expense.currency === 'USD' && expense.originalAmount && (
                  <span className="label-mono text-xs text-muted">
                    USD {expense.originalAmount} × ${expense.exchangeRate?.toLocaleString('es-AR')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-sm font-medium tabular-nums text-ink">{formatAmount(expense.amount)}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteExpense(expense)}
                  className="w-9 h-9 rounded-input flex items-center justify-center text-muted hover:text-error hover:bg-error-soft transition-colors cursor-pointer"
                  title="Eliminar gasto"
                  aria-label={`Eliminar gasto ${expense.description}`}
                >
                  <i className="pi pi-trash text-xs" aria-hidden="true"></i>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {onAddExpense && (
        <div className="px-4 sm:px-5 pb-4 pt-1">
          <button
            type="button"
            onClick={() => onAddExpense(categoryKey)}
            className="calm-btn-secondary w-full"
          >
            <i className="pi pi-plus text-xs" aria-hidden="true"></i>
            <span>Cargar gasto</span>
          </button>
        </div>
      )}
    </section>
  );
};

export default ExpenseList;
