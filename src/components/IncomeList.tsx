'use client';
import React from 'react';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Tooltip, TooltipContent } from '@/components/ui/Tooltip';
import { formatAmount } from '@/lib/formatAmount';

const IncomeList: React.FC = () => {
  const { incomes, removeIncome } = useExpenseContext();

  if (incomes.length === 0) {
    return (
      <div className="text-cds-muted text-xs py-2">
        Sin ingresos cargados
      </div>
    );
  }

  const total = incomes.reduce((sum, inc) => sum + inc.amount, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-cds-foreground">Ingresos</p>
          <Tooltip
            content={
              <TooltipContent
                title="Tus ingresos"
                description="Cada ingreso se distribuye según el split global o su split individual."
                example="Sueldo $200.000 (50/30/20) + Freelance $50.000 (60/20/20)"
              />
            }
          />
        </div>
        <Chip color="primary">{formatAmount(total)}</Chip>
      </div>
      <div className="flex flex-wrap gap-2">
        {incomes.map(inc => (
          <div
            key={inc.id}
            className="inline-flex items-center gap-2 bg-cds-surface border border-cds-border rounded-cds-sm px-3 py-2"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-cds-foreground truncate">{inc.description}</p>
              <p className="text-xs text-cds-muted">
                {formatAmount(inc.amount)}
                {inc.currency === 'USD' && ' (USD)'}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                isIconOnly
                onClick={() => removeIncome(inc.id)}
                className="text-cds-muted hover:text-cds-negative"
                title="Eliminar"
              >
                <i className="pi pi-trash text-[10px]"></i>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IncomeList;
