'use client';
import React, { useState } from 'react';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { Tooltip, TooltipContent } from '@/components/ui/Tooltip';
import { formatAmount } from '@/lib/formatAmount';
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
  const [editSplit, setEditSplit] = useState<Record<keyof SplitPercentages, string> | null>(null);

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
    setEditSplit(
      inc.splitOverride
        ? {
            needs: String(inc.splitOverride.needs),
            wants: String(inc.splitOverride.wants),
            savings: String(inc.splitOverride.savings),
          }
        : null
    );
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditSplit(null);
  };

  const saveEdit = (inc: Income) => {
    const num = Number(editForm.amount);
    if (!num || num <= 0 || !editForm.description.trim()) return;

    const updates: Partial<Income> = {
      description: editForm.description.trim(),
      currency: editForm.currency,
    };

    if (editForm.currency === 'USD') {
      updates.originalAmount = num;
      updates.amount = num; // Will be recalculated if exchange rate available
    } else {
      updates.amount = num;
      updates.originalAmount = undefined;
      updates.exchangeRate = undefined;
      updates.rateSource = undefined;
      updates.customRate = undefined;
    }

    // Split override
    if (editSplit) {
      const needs = Number(editSplit.needs) || 0;
      const wants = Number(editSplit.wants) || 0;
      const savings = Number(editSplit.savings) || 0;
      if (needs + wants + savings === 100) {
        updates.splitOverride = { needs, wants, savings };
      } else {
        updates.splitOverride = undefined;
      }
    } else {
      updates.splitOverride = undefined;
    }

    updateIncome(inc.id, updates);
    cancelEdit();
  };

  const handleSplitOverrideToggle = (enable: boolean) => {
    if (enable) {
      setEditSplit({ needs: '', wants: '', savings: '' });
    } else {
      setEditSplit(null);
    }
  };

  const handleSplitChange = (key: keyof SplitPercentages, value: string) => {
    const num = value === '' ? 0 : Number(value);
    if (value !== '' && (isNaN(num) || num < 0 || num > 100)) return;

    setEditSplit(prev => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      // Auto-calc third when two are filled
      const keys: (keyof SplitPercentages)[] = ['needs', 'wants', 'savings'];
      const filled = keys.filter(k => next[k] !== '');
      if (filled.length === 2) {
        const empty = keys.find(k => next[k] === '')!;
        const total = keys.reduce((sum, k) => sum + (Number(next[k]) || 0), 0);
        const auto = 100 - total + (Number(next[empty]) || 0);
        if (auto >= 0 && auto <= 100) {
          next[empty] = String(auto);
        }
      }
      return next;
    });
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
                    type="number"
                    value={editForm.amount}
                    onChange={v => setEditForm(f => ({ ...f, amount: v }))}
                    placeholder="Monto"
                    className="w-24"
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

                {/* Split override in edit mode */}
                {showSplitEditor && (
                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editSplit !== null}
                        onChange={e => handleSplitOverrideToggle(e.target.checked)}
                        className="accent-cds-primary"
                      />
                      <span className="text-[11px] text-cds-muted">Split propio</span>
                    </label>
                    {editSplit && (
                      <div className="flex gap-1 flex-1">
                        {(['needs', 'wants', 'savings'] as const).map(key => (
                          <div key={key} className="flex-1">
                            <p className="text-[10px] text-cds-muted mb-0.5">{SPLIT_LABELS[key]}</p>
                            <input
                              type="number"
                              value={editSplit[key]}
                              onChange={e => handleSplitChange(key, e.target.value)}
                              className="w-full bg-cds-canvas border border-cds-border rounded-cds-sm px-1.5 py-1 text-xs text-center tabular-nums"
                              placeholder="%"
                              min={0}
                              max={100}
                            />
                          </div>
                        ))}
                        {(() => {
                          const total = (['needs', 'wants', 'savings'] as const)
                            .reduce((s, k) => s + (Number(editSplit[k]) || 0), 0);
                          return total !== 100 && editSplit.needs !== '' && editSplit.wants !== '' && editSplit.savings !== '' ? (
                            <p className="text-[10px] text-cds-negative self-end pb-1">Suma {total}%</p>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                )}

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
                  >
                    <i className="pi pi-pencil text-[10px]"></i>
                  </Button>
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
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default IncomeList;
