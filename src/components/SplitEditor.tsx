'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Tooltip, TooltipContent } from '@/components/ui/Tooltip';
import { Toggle } from '@/components/ui/Toggle';
import { Select } from '@/components/ui/Select';
import { formatAmount } from '@/lib/formatAmount';
import type { SplitPercentages } from '@/interfaces/Income';

type CategoryKey = keyof SplitPercentages;

const CATEGORIES: { key: CategoryKey; label: string; color: string }[] = [
  { key: 'needs', label: 'Necesidad', color: 'bg-cds-primary' },
  { key: 'wants', label: 'Imprevistos', color: 'bg-cds-negative' },
  { key: 'savings', label: 'Ahorro', color: 'bg-cds-positive' },
];

const SPLIT_CHART_COLORS: Record<CategoryKey, string> = {
  needs: 'bg-cds-primary',
  wants: 'bg-cds-negative',
  savings: 'bg-cds-positive',
};

/** Auto-adjust other categories when one changes: adjacent first, then fallback */
function autoAdjust(
  changedKey: CategoryKey,
  newVal: number,
  current: SplitPercentages,
): SplitPercentages {
  const clampedNewVal = Math.min(100, Math.max(0, Math.round(newVal)));
  const oldVal = current[changedKey];
  const delta = Math.round((clampedNewVal - oldVal) * 100) / 100;
  if (delta === 0) return { ...current };

  const result: SplitPercentages = {
    ...current,
    [changedKey]: clampedNewVal,
  };
  const amount = Math.abs(delta); // total amount to shift between categories
  const addToOthers = delta < 0;  // if we decreased a category, others must increase

  // Determine adjustment order: adjacent first, then fallback
  const order: CategoryKey[] =
    changedKey === 'needs' ? ['wants', 'savings']
    : changedKey === 'savings' ? ['wants', 'needs']
    : ['needs', 'savings']; // wants → both sides proportionally

  let remaining = amount;

  for (const k of order) {
    if (remaining <= 0) break;
    let take: number;

    if (changedKey === 'wants') {
      // Proportional split between needs and savings
      const otherTotal = current.needs + current.savings;
      if (otherTotal === 0) {
        take = remaining;
      } else {
        take = addToOthers
          ? remaining // when adding, just split remaining evenly across both
          : Math.min(remaining, Math.round((current[k] / otherTotal) * remaining * 100) / 100);
        if (k === order[order.length - 1]) take = remaining; // flush rounding
      }
    } else {
      // Adjacent takes first, then fallback
      take = addToOthers
        ? remaining // no cap — we're adding, not subtracting
        : Math.min(remaining, Math.max(0, current[k]));
    }

    result[k] = addToOthers
      ? Math.round((current[k] + take) * 100) / 100
      : Math.round((current[k] - take) * 100) / 100;

    remaining -= take;
  }

  return result;
}

type Mode = 'global' | 'individual';

const SplitEditor: React.FC = () => {
  const { globalSplit, setGlobalSplit, incomes, updateIncome } = useExpenseContext();

  // ── Mode state ──
  const [mode, setMode] = useState<Mode>('global');
  const [selectedIncomeId, setSelectedIncomeId] = useState<string>('');

  // ── Split values ──
  const [values, setValues] = useState<SplitPercentages>({ ...globalSplit });
  const [customMode, setCustomMode] = useState(false);

  // ── Refs for stale-closure safety ──
  const dirtyRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const selectedIncomeIdRef = useRef(selectedIncomeId);
  selectedIncomeIdRef.current = selectedIncomeId;

  const total = useMemo(
    () => values.needs + values.wants + values.savings,
    [values],
  );
  const isValid = Math.abs(total - 100) < 0.01;

  // Sync values when globalSplit changes from outside (global mode only)
  useEffect(() => {
    if (mode === 'global') {
      setValues({ ...globalSplit });
    }
  }, [globalSplit.needs, globalSplit.wants, globalSplit.savings, mode]);

  // Cleanup debounce + flush on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (dirtyRef.current) {
        const v = valuesRef.current;
        if (Math.abs(v.needs + v.wants + v.savings - 100) < 0.01) {
          if (modeRef.current === 'global') {
            setGlobalSplit(v);
          } else if (modeRef.current === 'individual' && selectedIncomeIdRef.current) {
            updateIncome(selectedIncomeIdRef.current, { splitOverride: v });
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Flush dirty values immediately (used when switching incomes/mode) ──
  const flushIfDirty = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (dirtyRef.current && isValid) {
      const v = valuesRef.current;
      if (modeRef.current === 'global') {
        setGlobalSplit(v);
      } else if (modeRef.current === 'individual' && selectedIncomeIdRef.current) {
        updateIncome(selectedIncomeIdRef.current, { splitOverride: v });
      }
      dirtyRef.current = false;
    }
  }, [isValid, setGlobalSplit, updateIncome]);

  const doSave = (v: SplitPercentages) => {
    if (Math.abs(v.needs + v.wants + v.savings - 100) >= 0.01) return;
    if (modeRef.current === 'global') {
      setGlobalSplit(v);
    } else if (modeRef.current === 'individual' && selectedIncomeIdRef.current) {
      updateIncome(selectedIncomeIdRef.current, { splitOverride: v });
    }
    dirtyRef.current = false;
  };

  const scheduleSave = (v: SplitPercentages) => {
    dirtyRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSave(v), 5000);
  };

  const handleChange = (key: CategoryKey, rawValue: string) => {
    const num = rawValue === '' ? 0 : Number(rawValue);
    if (rawValue !== '' && (isNaN(num) || num < 0 || num > 100)) return;

    let newValues: SplitPercentages;

    if (customMode) {
      // Direct edit — only clamp
      newValues = { ...values, [key]: Math.min(100, Math.max(0, Math.round(num))) };
    } else {
      // Smart auto-adjustment
      newValues = autoAdjust(key, num, values);
    }

    setValues(newValues);
    scheduleSave(newValues);
  };

  const handleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (dirtyRef.current && isValid) {
      doSave(values);
    }
  };

  // ── Income selector options ──
  const incomeOptions = useMemo(
    () =>
      incomes.map((inc) => ({
        key: inc.id,
        label: `${inc.description} — ${formatAmount(inc.amount)}`,
      })),
    [incomes],
  );

  const selectedIncome = useMemo(
    () => incomes.find((inc) => inc.id === selectedIncomeId) ?? null,
    [incomes, selectedIncomeId],
  );

  const headerTitle =
    mode === 'individual' && selectedIncome
      ? `Split de ${selectedIncome.description}`
      : 'Distribución del presupuesto';

  // ── Toggle handler ──
  const handleToggle = (checked: boolean) => {
    if (checked) {
      // Switching to individual mode
      flushIfDirty();
      setMode('individual');
    } else {
      // Switching back to global mode
      flushIfDirty();
      setSelectedIncomeId('');
      setMode('global');
      setValues({ ...globalSplit });
      setCustomMode(false);
    }
  };

  // ── Income selection handler ──
  const handleIncomeChange = (id: string) => {
    // Flush current edits to the previous income before switching
    flushIfDirty();
    setSelectedIncomeId(id);
    if (id) {
      const inc = incomes.find((i) => i.id === id);
      if (inc) {
        setValues(inc.splitOverride ? { ...inc.splitOverride } : { ...globalSplit });
      }
    }
  };

  // Disable per-income toggle when there's only 0 or 1 income
  const toggleDisabled = incomes.length < 2;

  return (
    <div className="border border-cds-border rounded-cds-lg bg-cds-surface px-4 py-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-cds-foreground">{headerTitle}</p>
        <Tooltip
          content={
            <TooltipContent
              title="Distribución del presupuesto"
              description="Porcentaje de cada ingreso que se destina a cada categoría. Deben sumar 100%."
              example="50% Necesidad · 30% Imprevistos · 20% Ahorro"
            />
          }
        />
      </div>

      {/* Income amount in individual mode */}
      {mode === 'individual' && selectedIncome && (
        <p className="text-xs text-cds-muted">
          Ingreso: {formatAmount(selectedIncome.amount)}
          {selectedIncome.currency === 'USD' && ` (USD ${selectedIncome.originalAmount})`}
        </p>
      )}

      {/* Global / Individual Toggle */}
      <div className="flex items-center gap-2 pt-1">
        <span className={`text-xs font-medium ${mode === 'global' ? 'text-cds-foreground' : 'text-cds-muted'}`}>
          Global
        </span>
        <Toggle
          checked={mode === 'individual'}
          onChange={handleToggle}
          disabled={toggleDisabled}
          label="Por ingreso"
        />
      </div>

      {/* Income selector (individual mode) */}
      {mode === 'individual' && (
        <Select
          label="Ingreso"
          value={selectedIncomeId}
          onChange={handleIncomeChange}
          options={incomeOptions}
          placeholder="Seleccioná un ingreso"
        />
      )}

      {/* Input grid */}
      <div className="grid grid-cols-3 gap-2">
        {CATEGORIES.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-[11px] text-cds-muted font-medium">{label}</label>
            <input
              type="number"
              value={values[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              onBlur={handleBlur}
              className={`w-full bg-cds-canvas border rounded-cds-sm px-2.5 py-2 text-sm text-center tabular-nums outline-none transition-colors ${
                !isValid
                  ? 'border-cds-negative focus:shadow-[0_0_0_1px_var(--cds-negative)]'
                  : 'border-cds-border focus:border-cds-primary focus:shadow-[0_0_0_1px_var(--cds-primary)]'
              }`}
              min={0}
              max={100}
              step={1}
            />
          </div>
        ))}
      </div>

      {/* Footer: validation + custom mode */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className={`text-xs font-semibold ${isValid ? 'text-cds-positive' : 'text-cds-negative'}`}>
            Suma: {total}%
            {!isValid && ' — debe ser 100%'}
          </p>
          {dirtyRef.current && isValid && (
            <span className="text-[10px] text-cds-muted italic">guardando...</span>
          )}
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={customMode}
            onChange={(e) => setCustomMode(e.target.checked)}
            className="accent-cds-primary w-3 h-3"
          />
          <span className="text-[11px] text-cds-muted">Editar libre</span>
        </label>
      </div>

      {/* Visual bar — only in global mode */}
      {mode === 'global' && (
        <div className="flex h-2.5 rounded-full overflow-hidden bg-cds-border">
          {CATEGORIES.map(({ key, color }) => (
            <div
              key={key}
              className={`${color} transition-all duration-300`}
              style={{ width: `${Math.max(0, values[key])}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SplitEditor;
