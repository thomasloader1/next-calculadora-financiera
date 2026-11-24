'use client';

import React, { useState } from 'react';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
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

const TransferList: React.FC = () => {
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
    <div className="calm-card p-5 sm:p-6 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-[#232B25] dark:text-white uppercase tracking-wider">
          <i className="pi pi-exchange-alt text-[#D46743] text-xs"></i>
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
            className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-[#FAF8F5] dark:bg-[#161C17] rounded-2xl border border-[#E8E2D8] dark:border-[#2A362D] transition-colors"
          >
            {editId === transfer.id ? (
              /* --- Edit Mode --- */
              <div className="flex items-center gap-2 w-full">
                <span className="text-xs font-medium text-[#232B25] dark:text-white shrink-0">
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
                  <i className="pi pi-arrow-right text-[10px] text-[#8A9A8E] shrink-0"></i>
                  <span className="text-xs font-semibold text-[#232B25] dark:text-white truncate">
                    {CATEGORY_LABELS[transfer.from]} → {CATEGORY_LABELS[transfer.to]}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    transfer.isAutomatic
                      ? 'bg-[#FDF5EC] text-[#C47535] dark:bg-[#2D1F13] dark:text-[#EFA66C] border border-[#F7D2AF] dark:border-[#56361D]'
                      : 'bg-[#FCEEE9] text-[#D46743] dark:bg-[#301C15] dark:text-[#E28669] border border-[#F4C5B5] dark:border-[#5A2C1D]'
                  }`}>
                    {transfer.isAutomatic ? 'Auto' : 'Manual'}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold font-mono text-[#232B25] dark:text-white tabular-nums">
                    ${transfer.amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(transfer)}
                    title="Editar monto"
                    className="w-7 h-7 flex items-center justify-center rounded-full text-[#8A9A8E] hover:text-[#232B25] dark:hover:text-white hover:bg-[#F4EFE8] dark:hover:bg-[#2A362D] transition-colors cursor-pointer"
                  >
                    <i className="pi pi-pencil text-[11px]"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTransferAndExpense(transfer.id)}
                    title="Eliminar transferencia"
                    className="w-7 h-7 flex items-center justify-center rounded-full text-[#8A9A8E] hover:text-[#B44C4C] hover:bg-[#B44C4C]/10 transition-colors cursor-pointer"
                  >
                    <i className="pi pi-trash text-[11px]"></i>
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
