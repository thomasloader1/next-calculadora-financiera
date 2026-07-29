'use client';
import React, { useState } from 'react';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tooltip, TooltipContent } from '@/components/ui/Tooltip';
import { parseMaskedAmount } from '@/lib/formatAmount';
import type { Transfer } from '@/interfaces/Transfer';

const CATEGORY_LABELS: Record<string, string> = {
  needs: 'Necesidad',
  wants: 'Imprevistos',
  savings: 'Ahorro',
};

const TransferList = () => {
  const { transfers, removeTransferAndExpense, updateTransferAmount } = useExpenseContext();
  const [editId, setEditId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  if (transfers.length === 0) return null;

  const startEdit = (t: Transfer) => {
    setEditId(t.id);
    setEditAmount(String(t.amount));
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditAmount('');
  };

  const saveEdit = (t: Transfer) => {
    const num = parseMaskedAmount(editAmount);
    if (!num || num <= 0) return;
    updateTransferAmount(t.id, num);
    cancelEdit();
  };

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
            {editId === transfer.id ? (
              /* --- Edit Mode --- */
              <div className="flex items-center gap-2 w-full">
                <span className="text-xs text-cds-foreground shrink-0">
                  {CATEGORY_LABELS[transfer.from]} → {CATEGORY_LABELS[transfer.to]}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editAmount}
                  onChange={setEditAmount}
                  placeholder="150000"
                  className="w-28"
                />
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => saveEdit(transfer)}>
                    Guardar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              /* --- Display Mode --- */
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <i className="pi pi-exchange-alt text-[10px] text-cds-muted shrink-0"></i>
                  <span className="text-xs text-cds-foreground truncate">
                    {CATEGORY_LABELS[transfer.from]} → {CATEGORY_LABELS[transfer.to]}
                  </span>
                  <Chip color={transfer.isAutomatic ? 'warning' : 'primary'}>
                    {transfer.isAutomatic ? 'Auto' : 'Manual'}
                  </Chip>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-semibold text-cds-foreground tabular-nums">
                    ${transfer.amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    onClick={() => startEdit(transfer)}
                    title="Editar monto"
                    className="text-cds-muted hover:text-cds-foreground"
                    startContent={<i className="pi pi-pencil"></i>}
                  ></Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    onClick={() => removeTransferAndExpense(transfer.id)}
                    title="Eliminar transferencia"
                    className="text-cds-muted hover:text-cds-negative"
                    startContent={<i className="pi pi-trash"></i>}
                  ></Button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransferList;
