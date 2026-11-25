'use client';

import React, { useState } from 'react';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tooltip, TooltipContent } from '@/components/ui/Tooltip';
import { parseMaskedAmount } from '@/lib/formatAmount';
import { validateAmount } from '@/lib/validation';
import type { Transfer } from '@/interfaces/Transfer';

const CATEGORY_LABELS: Record<string, string> = {
  needs: 'Necesidad',
  wants: 'Imprevistos',
  savings: 'Ahorro',
};

const TransferList: React.FC = () => {
  const { transfers, removeTransferAndExpense, updateTransferAmount } = useExpenseContext();
  const [editId, setEditId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editTried, setEditTried] = useState(false);

  if (transfers.length === 0) return null;

  const startEdit = (t: Transfer) => {
    setEditId(t.id);
    setEditAmount(String(t.amount));
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditAmount('');
    setEditTried(false);
  };

  const saveEdit = (t: Transfer) => {
    if (validateAmount(editAmount)) {
      setEditTried(true);
      return;
    }
    const num = parseMaskedAmount(editAmount);
    updateTransferAmount(t.id, num);
    cancelEdit();
  };

  return (
    <div className="calm-card p-5 sm:p-6 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-ink">
          <i className="pi pi-exchange-alt text-accent text-xs"></i>
          <span>Transferencias entre fondos ({transfers.length})</span>
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
      </div>

      <div className="space-y-2">
        {transfers.map((transfer) => (
          <div
            key={transfer.id}
            className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-paper-2 rounded-input"
          >
            {editId === transfer.id ? (
              /* --- Edit Mode --- */
              <div className="flex items-start gap-2 w-full">
                <span className="text-xs font-medium text-ink shrink-0">
                  {CATEGORY_LABELS[transfer.from]} → {CATEGORY_LABELS[transfer.to]}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={editAmount}
                  onChange={setEditAmount}
                  aria-label="Monto de la transferencia"
                  error={editTried ? validateAmount(editAmount) : null}
                  placeholder="150000"
                  className="w-28"
                />
                <div className="flex gap-1.5 shrink-0">
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
                <div className="flex items-center gap-2.5 min-w-0">
                  <i className="pi pi-arrow-right text-xs text-muted shrink-0"></i>
                  <span className="text-sm font-medium text-ink truncate">
                    {CATEGORY_LABELS[transfer.from]} → {CATEGORY_LABELS[transfer.to]}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-paper-3 text-ink-2">
                    {transfer.isAutomatic ? 'Auto' : 'Manual'}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold font-mono text-ink tabular-nums">
                    ${transfer.amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(transfer)}
                    title="Editar monto"
                    className="w-7 h-7 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-paper-2 transition-colors cursor-pointer"
                  >
                    <i className="pi pi-pencil text-xs"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTransferAndExpense(transfer.id)}
                    title="Eliminar transferencia"
                    className="w-7 h-7 flex items-center justify-center rounded-full text-muted hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                  >
                    <i className="pi pi-trash text-xs"></i>
                  </button>
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
