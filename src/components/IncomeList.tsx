'use client';
import React, { useState } from 'react';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { Tooltip, TooltipContent } from '@/components/ui/Tooltip';
import { formatAmount, parseMaskedAmount } from '@/lib/formatAmount';
import type { Income, SplitPercentages } from '@/interfaces/Income';

const SPLIT_LABELS: Record<keyof SplitPercentages, string> = {
  needs: 'Nec.',
  wants: 'Des.',
  savings: 'Aho.',
};

const IncomeList: React.FC = () => {
  const { incomes, removeIncome, updateIncome, globalSplit } = useExpenseContext();
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    amount: '',
    currency: 'ARS' as 'ARS' | 'USD',
  });

  if (incomes.length === 0) {
    return (
      <div className="text-cds-muted text-xs py-2">
        Sin ingresos cargados
      </div>
    );
  }

  const total = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const showSplitEditor = incomes.length >= 2;

  const startEdit = (inc: Income) => {
    setEditId(inc.id);
    setEditForm({
      description: inc.description,
      amount: String(inc.originalAmount || inc.amount),
      currency: inc.currency,
    });
  };

  const cancelEdit = () => {
    setEditId(null);
  };

  const saveEdit = (inc: Income) => {
    const num = parseMaskedAmount(editForm.amount);
    if (!num || num <= 0 || !editForm.description.trim()) return;

    const updates: Record<string, unknown> = {
      description: editForm.description.trim(),
      currency: editForm.currency,
      amount: num,
    };

    if (editForm.currency === 'USD') {
      updates.originalAmount = num;
    }

    updateIncome(inc.id, updates as Partial<Income>);
    cancelEdit();
  };

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
            className="inline-flex items-center gap-2 bg-cds-surface border border-cds-border rounded-cds-sm px-3 py-2 min-w-0"
          >
            {editId === inc.id ? (
              /* --- Edit Mode --- */
              <div className="flex flex-col gap-2 min-w-[260px]">
                <div className="flex gap-2">
                  <Input
                    value={editForm.description}
                    onChange={v => setEditForm(f => ({ ...f, description: v }))}
                    placeholder="Descripción"
                    className="flex-1 min-w-0"
                  />
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editForm.amount}
                    onChange={v => setEditForm(f => ({ ...f, amount: v }))}
                    placeholder="150000"
                    className="w-28"
                  />
                  <div className="flex bg-cds-surface-dark border border-cds-border rounded-cds-sm overflow-hidden h-[34px]">
                    <button
                      type="button"
                      onClick={() => setEditForm(f => ({ ...f, currency: 'ARS' }))}
                      className={`px-2 text-[11px] font-semibold transition-colors ${
                        editForm.currency === 'ARS'
                          ? 'bg-cds-primary text-cds-on-primary'
                          : 'text-cds-muted hover:text-cds-foreground'
                      }`}
                    >
                      ARS
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm(f => ({ ...f, currency: 'USD' }))}
                      className={`px-2 text-[11px] font-semibold transition-colors ${
                        editForm.currency === 'USD'
                          ? 'bg-cds-primary text-cds-on-primary'
                          : 'text-cds-muted hover:text-cds-foreground'
                      }`}
                    >
                      USD
                    </button>
                  </div>
                </div>

                <div className="flex gap-1 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => saveEdit(inc)}>
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
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-cds-foreground truncate">{inc.description}</p>
                  <p className="text-xs text-cds-muted">
                    {formatAmount(inc.amount)}
                    {inc.currency === 'USD' && ' (USD)'}
                  </p>
                </div>
                {showSplitEditor && inc.splitOverride && (
                  <div className="flex gap-0.5 text-[10px] text-cds-muted font-mono">
                    <span className="text-cds-positive">{inc.splitOverride.needs}%</span>
                    <span className="text-cds-warning">{inc.splitOverride.wants}%</span>
                    <span className="text-cds-primary">{inc.splitOverride.savings}%</span>
                  </div>
                )}
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    isIconOnly
                    onClick={() => startEdit(inc)}
                    className="text-cds-muted hover:text-cds-foreground"
                    title="Editar"
                    startContent={<i className="pi pi-pencil"></i>}
                  >
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    isIconOnly
                    onClick={() => removeIncome(inc.id)}
                    className="text-cds-muted hover:text-cds-negative"
                    title="Eliminar"
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

export default IncomeList;
