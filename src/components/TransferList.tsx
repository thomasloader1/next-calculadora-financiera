'use client';
import React from 'react';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Tooltip, TooltipContent } from '@/components/ui/Tooltip';

const CATEGORY_LABELS: Record<string, string> = {
  needs: 'Necesidad',
  wants: 'Imprevistos',
  savings: 'Ahorro',
};

const TransferList = () => {
  const { transfers, removeTransferAndExpense } = useExpenseContext();

  if (transfers.length === 0) return null;

  return (
    <div className="border border-cds-border rounded-cds-lg bg-cds-surface px-4 py-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-cds-foreground">
        <i className="pi pi-exchange-alt text-sm text-cds-primary"></i>
        Transferencias ({transfers.length})
        <Tooltip
          content={
            <TooltipContent
              title="Transferencias"
              description="Movimientos de fondos entre categorías. Pueden ser automáticos (préstamos) o manuales."
              example="Ahorro → Necesidad $20.000 cuando los gastos fijos superaron el presupuesto"
            />
          }
        />
      </div>

      <div className="space-y-1.5">
        {transfers.map((transfer) => (
          <div
            key={transfer.id}
            className="flex items-center justify-between gap-2 px-3 py-2 bg-cds-surface rounded-cds-sm border border-cds-border"
          >
            <div className="flex items-center gap-2 min-w-0">
              <i className="pi pi-exchange-alt text-[10px] text-cds-muted shrink-0"></i>
              <span className="text-xs text-cds-foreground truncate">
                {CATEGORY_LABELS[transfer.from]} → {CATEGORY_LABELS[transfer.to]}
              </span>
              <Chip color={transfer.isAutomatic ? 'warning' : 'primary'}>
                {transfer.isAutomatic ? 'Auto' : 'Manual'}
              </Chip>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-cds-foreground tabular-nums">
                ${transfer.amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                onClick={() => removeTransferAndExpense(transfer.id)}
                title="Eliminar transferencia"
                className="text-cds-muted hover:text-cds-negative"
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

export default TransferList;
