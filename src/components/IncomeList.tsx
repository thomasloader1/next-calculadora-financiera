'use client';
import React, { useState } from 'react';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { Tooltip, TooltipContent } from '@/components/ui/Tooltip';
import { formatAmount, parseMaskedAmount } from '@/lib/formatAmount';
import { validateAmount, validateDescription, MAX_DESCRIPTION } from '@/lib/validation';
import type { Income } from '@/interfaces/Income';
import { toast } from 'sonner';

const IncomeList: React.FC = () => {
  const { incomes, removeIncome, updateIncome, addIncome } = useExpenseContext();
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    amount: '',
    currency: 'ARS' as 'ARS' | 'USD',
  });
  const [editTried, setEditTried] = useState(false);

  const handleDeleteIncome = (inc: Income) => {
    removeIncome(inc.id);
    toast('Ingreso eliminado', {
      description: `${inc.description} (${formatAmount(inc.amount)})`,
      action: {
        label: 'Deshacer',
        onClick: () => {
          addIncome(inc);
          toast.success('Ingreso restaurado');
        },
      },
    });
  };

  if (incomes.length === 0) {
    return null;
  }

  const total = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const showSplitEditor = incomes.length >= 2;

  const startEdit = (inc: Income) => {
    setEditId(inc.id);
    setEditTried(false);
    setEditForm({
      description: inc.description,
      amount: String(inc.originalAmount || inc.amount),
      currency: inc.currency,
    });
  };

  const editDescriptionError = validateDescription(editForm.description, { required: true });
  const editAmountError = validateAmount(editForm.amount);

  const cancelEdit = () => {
    setEditId(null);
    setEditTried(false);
  };

  const saveEdit = (inc: Income) => {
    if (editDescriptionError || editAmountError) {
      setEditTried(true);
      return;
    }
    const num = parseMaskedAmount(editForm.amount);

    const updates: Record<string, unknown> = {
      description: editForm.description.trim(),
      currency: editForm.currency,
      amount: inc.currency === 'USD' && editForm.currency === 'USD' && inc.exchangeRate
        ? Math.round(num * inc.exchangeRate * 100) / 100
        : num,
    };

    if (editForm.currency === 'USD') {
      updates.originalAmount = num;
    }

    updateIncome(inc.id, updates as Partial<Income>);
    cancelEdit();
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-ink">
            Fuentes registradas ({incomes.length})
          </p>
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

      <ul className="divide-y divide-rule rounded-input border border-rule bg-paper-2 max-h-60 overflow-y-auto">
        {incomes.map(inc => (
          <li key={inc.id} className="px-3.5 py-2.5">
            {editId === inc.id ? (
              /* --- Edit Mode --- */
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start">
                  <Input
                    value={editForm.description}
                    onChange={v => setEditForm(f => ({ ...f, description: v }))}
                    aria-label="Descripción del ingreso"
                    maxLength={MAX_DESCRIPTION + 20}
                    error={editTried ? editDescriptionError : null}
                    placeholder="Descripción"
                    className="flex-1 min-w-0"
                  />
                  <div className="flex gap-2 items-start">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={editForm.amount}
                      onChange={v => setEditForm(f => ({ ...f, amount: v }))}
                      aria-label="Monto del ingreso"
                      error={editTried ? editAmountError : null}
                      placeholder="150000"
                      className="w-32"
                    />
                    <div className="calm-segmented-container shrink-0" role="group" aria-label="Moneda">
                      <button
                        type="button"
                        onClick={() => setEditForm(f => ({ ...f, currency: 'ARS' }))}
                        aria-pressed={editForm.currency === 'ARS'}
                        className={`calm-segmented-tab min-h-[36px] px-2.5 ${editForm.currency === 'ARS' ? 'calm-segmented-tab-active' : ''}`}
                      >
                        ARS
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditForm(f => ({ ...f, currency: 'USD' }))}
                        aria-pressed={editForm.currency === 'USD'}
                        className={`calm-segmented-tab min-h-[36px] px-2.5 ${editForm.currency === 'USD' ? 'calm-segmented-tab-active' : ''}`}
                      >
                        USD
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1.5 justify-end">
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={() => saveEdit(inc)}>
                    Guardar
                  </Button>
                </div>
              </div>
            ) : (
              /* --- Display Mode --- */
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">{inc.description}</p>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted tabular-nums">
                    {inc.currency === 'USD' && inc.originalAmount && (
                      <span className="label-mono">
                        US$ {inc.originalAmount.toLocaleString('es-AR')}
                        {inc.exchangeRate ? ` × $${inc.exchangeRate.toLocaleString('es-AR')}` : ''}
                      </span>
                    )}
                    {showSplitEditor && inc.splitOverride && (
                      <span>
                        ({inc.splitOverride.needs}/{inc.splitOverride.wants}/{inc.splitOverride.savings}%)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm font-medium tabular-nums text-ink mr-1">
                    {formatAmount(inc.amount)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    isIconOnly
                    onClick={() => startEdit(inc)}
                    className="text-muted hover:text-ink"
                    title="Editar ingreso"
                    aria-label={`Editar ingreso ${inc.description}`}
                    startContent={<i className="pi pi-pencil text-xs"></i>}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    isIconOnly
                    onClick={() => handleDeleteIncome(inc)}
                    className="text-muted hover:text-error"
                    title="Eliminar ingreso"
                    aria-label={`Eliminar ingreso ${inc.description}`}
                    startContent={<i className="pi pi-trash text-xs"></i>}
                  />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default IncomeList;
