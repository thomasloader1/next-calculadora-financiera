'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Tooltip, TooltipContent } from '@/components/ui/Tooltip';
import { formatAmount } from '@/lib/formatAmount';
import type { SplitPercentages } from '@/interfaces/Income';

type CategoryKey = keyof SplitPercentages;

const CATEGORIES: { key: CategoryKey; label: string; color: string; bgSoft: string; textCol: string }[] = [
  { key: 'needs', label: 'Necesidad', color: 'bg-[#D46743]', bgSoft: 'bg-[#FCEEE9] dark:bg-[#301C15]', textCol: 'text-[#D46743] dark:text-[#E28669]' },
  { key: 'wants', label: 'Imprevistos', color: 'bg-[#E89B5B]', bgSoft: 'bg-[#FDF5EC] dark:bg-[#2D1F13]', textCol: 'text-[#C47535] dark:text-[#EFA66C]' },
  { key: 'savings', label: 'Ahorro', color: 'bg-[#3DA6AD]', bgSoft: 'bg-[#EDF9FA] dark:bg-[#132426]', textCol: 'text-[#2A8187] dark:text-[#BFE7EA]' },
];

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
  const amount = Math.abs(delta);
  const addToOthers = delta < 0;

  const order: CategoryKey[] =
    changedKey === 'needs' ? ['wants', 'savings']
    : changedKey === 'savings' ? ['wants', 'needs']
    : ['needs', 'savings'];

  let remaining = amount;

  for (const k of order) {
    if (remaining <= 0) break;
    let take: number;

    if (changedKey === 'wants') {
      const otherTotal = current.needs + current.savings;
      if (otherTotal === 0) {
        take = remaining;
      } else {
        take = addToOthers
          ? remaining
          : Math.min(remaining, Math.round((current[k] / otherTotal) * remaining * 100) / 100);
        if (k === order[order.length - 1]) take = remaining;
      }
    } else {
      take = addToOthers
        ? remaining
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

  const [mode, setMode] = useState<Mode>('global');
  const [values, setValues] = useState<SplitPercentages>({ ...globalSplit });
  const [isExpanded, setIsExpanded] = useState(false);

  const dirtyRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    if (mode === 'global') {
      setValues({ ...globalSplit });
    }
  }, [globalSplit.needs, globalSplit.wants, globalSplit.savings, mode]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const flushSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!dirtyRef.current || modeRef.current !== 'global') return;
    const v = valuesRef.current;
    const currentTotal = v.needs + v.wants + v.savings;
    if (Math.abs(currentTotal - 100) > 0.01) return;
    dirtyRef.current = false;
    setGlobalSplit(v);
  }, [setGlobalSplit]);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(flushSave, 400);
  }, [flushSave]);

  const handleChange = useCallback((key: CategoryKey, newVal: number) => {
    setValues(prev => {
      const next = autoAdjust(key, newVal, prev);
      valuesRef.current = next;
      return next;
    });
    scheduleSave();
  }, [scheduleSave]);

  const handleIncomeSplitChange = useCallback((incomeId: string, key: CategoryKey, num: number) => {
    const income = incomes.find(i => i.id === incomeId);
    const current = income?.splitOverride ?? globalSplit;
    const adjusted = autoAdjust(key, num, current);
    updateIncome(incomeId, { splitOverride: adjusted });
  }, [incomes, globalSplit, updateIncome]);

  const toggleDisabled = incomes.length < 2;

  return (
    <div className="calm-card transition-all overflow-hidden mb-6">
      {/* Header bar / preview */}
      <div className="p-5 sm:p-6 flex flex-col gap-3.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5F6F63] dark:text-[#A3B4A5]">
              Distribución de presupuesto
            </span>
            <Tooltip
              content={
                <TooltipContent
                  title="Regla de Presupuesto 50/30/20"
                  description="Porcentaje de tus ingresos destinado a cada fondo. La suma debe dar 100%."
                  example="50% Necesidades · 30% Imprevistos/Deseos · 20% Ahorro"
                />
              }
            />
          </div>

          <div className="flex items-center gap-2">
            {!toggleDisabled && (
              <div className="flex items-center bg-[#FFEAD3] dark:bg-[#261F1A] p-1 rounded-full text-xs font-medium border border-[#F0D7BC] dark:border-[#3A2E25]">
                <button
                  type="button"
                  onClick={() => setMode('global')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    mode === 'global' ? 'bg-[#D46743] text-white shadow-xs' : 'text-[#6B5547] hover:text-[#2C211B]'
                  }`}
                >
                  Global
                </button>
                <button
                  type="button"
                  onClick={() => setMode('individual')}
                  className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                    mode === 'individual' ? 'bg-[#D46743] text-white shadow-xs' : 'text-[#6B5547] hover:text-[#2C211B]'
                  }`}
                >
                  Por ingreso
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-semibold text-[#D46743] dark:text-[#E28669] hover:underline flex items-center gap-1 cursor-pointer pl-2"
            >
              <span>{isExpanded ? 'Ocultar ajuste' : 'Personalizar split'}</span>
              <i className={`pi pi-chevron-down text-[10px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
            </button>
          </div>
        </div>

        {/* Visual Segmented Progress Bar (Pill style) */}
        <div className="space-y-2">
          <div className="calm-progress-track h-3 flex overflow-hidden">
            <div
              style={{ width: `${values.needs}%` }}
              className="bg-[#D46743] transition-all duration-300 relative"
              title={`Necesidades: ${values.needs}%`}
            />
            <div
              style={{ width: `${values.wants}%` }}
              className="bg-[#E89B5B] transition-all duration-300 relative"
              title={`Imprevistos: ${values.wants}%`}
            />
            <div
              style={{ width: `${values.savings}%` }}
              className="bg-[#3DA6AD] transition-all duration-300 relative"
              title={`Ahorro: ${values.savings}%`}
            />
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between text-xs font-mono font-medium pt-1 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-[#D46743] dark:text-[#E28669]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D46743] inline-block"></span>
              <span>Necesidades ({values.needs}%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#C47535] dark:text-[#EFA66C]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E89B5B] inline-block"></span>
              <span>Imprevistos ({values.wants}%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#2A8187] dark:text-[#BFE7EA]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3DA6AD] inline-block"></span>
              <span>Ahorro ({values.savings}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Editor Panel */}
      {isExpanded && (
        <div className="border-t border-[#F0D7BC] dark:border-[#3A2E25] bg-[#FFEAD3]/40 dark:bg-[#1A1410]/40 p-5 animate-in fade-in duration-200">
          {mode === 'global' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {CATEGORIES.map(cat => (
                <div
                  key={cat.key}
                  className="bg-white dark:bg-[#1E1814] border border-[#F0D7BC] dark:border-[#3A2E25] p-4 rounded-2xl shadow-xs flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2C211B] dark:text-white">
                      {cat.label}
                    </span>
                    <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full ${cat.bgSoft} ${cat.textCol}`}>
                      {values[cat.key]}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={values[cat.key]}
                    onChange={e => handleChange(cat.key, Number(e.target.value))}
                    className="w-full h-2 bg-[#FFEAD3] dark:bg-[#2E2218] rounded-lg appearance-none cursor-pointer accent-[#D46743]"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => handleChange(cat.key, Math.max(0, values[cat.key] - 5))}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-[#FFEAD3] dark:bg-[#2E2218] text-[#2C211B] dark:text-white hover:bg-[#F0D7BC] font-bold text-xs cursor-pointer"
                    >
                      -5
                    </button>
                    <span className="text-[11px] text-[#9E8575] font-mono">auto-ajustable</span>
                    <button
                      type="button"
                      onClick={() => handleChange(cat.key, Math.min(100, values[cat.key] + 5))}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-[#FFEAD3] dark:bg-[#2E2218] text-[#2C211B] dark:text-white hover:bg-[#F0D7BC] font-bold text-xs cursor-pointer"
                    >
                      +5
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#F0D7BC] dark:border-[#3A2E25] bg-white dark:bg-[#1E1814]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFEAD3] dark:bg-[#261F1A] border-b border-[#F0D7BC] dark:border-[#3A2E25] text-[#6B5547] font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5">Ingreso</th>
                    <th className="p-3.5">Monto</th>
                    <th className="p-3.5 text-[#D46743]">Necesidades %</th>
                    <th className="p-3.5 text-[#C47535]">Imprevistos %</th>
                    <th className="p-3.5 text-[#2A8187]">Ahorro %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2D8] dark:divide-[#2A362D]">
                  {incomes.map(inc => {
                    const incSplit = inc.splitOverride || globalSplit;
                    return (
                      <tr key={inc.id} className="hover:bg-[#F4EFE8]/50 dark:hover:bg-[#253227]/40 transition-colors">
                        <td className="p-3.5 font-bold text-[#232B25] dark:text-white">
                          {inc.description}
                        </td>
                        <td className="p-3.5 font-mono text-[#5F6F63] dark:text-[#A3B4A5]">
                          {formatAmount(inc.amount)}
                        </td>
                        <td className="p-3.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={incSplit.needs}
                            onChange={e => handleIncomeSplitChange(inc.id, 'needs', Number(e.target.value))}
                            className="w-16 px-2.5 py-1.5 bg-[#F4EFE8] dark:bg-[#253227] border border-[#E8E2D8] dark:border-[#2A362D] rounded-xl font-mono text-center"
                          />
                        </td>
                        <td className="p-3.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={incSplit.wants}
                            onChange={e => handleIncomeSplitChange(inc.id, 'wants', Number(e.target.value))}
                            className="w-16 px-2.5 py-1.5 bg-[#F4EFE8] dark:bg-[#253227] border border-[#E8E2D8] dark:border-[#2A362D] rounded-xl font-mono text-center"
                          />
                        </td>
                        <td className="p-3.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={incSplit.savings}
                            onChange={e => handleIncomeSplitChange(inc.id, 'savings', Number(e.target.value))}
                            className="w-16 px-2.5 py-1.5 bg-[#F4EFE8] dark:bg-[#253227] border border-[#E8E2D8] dark:border-[#2A362D] rounded-xl font-mono text-center"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SplitEditor;
