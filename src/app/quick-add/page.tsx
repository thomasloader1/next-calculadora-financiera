'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Expense } from '@/interfaces/Expense';
import { Income } from '@/interfaces/Income';
import { toast } from 'sonner';
import Link from 'next/link';

const CATEGORIES = [
  { key: 'needs', label: 'Necesidad', icon: 'pi-home', color: '#D46743', bg: 'bg-[#FCEEE9] text-[#D46743] dark:bg-[#301C15] dark:text-[#E28669] border-[#D46743]' },
  { key: 'wants', label: 'Imprevistos', icon: 'pi-bolt', color: '#E89B5B', bg: 'bg-[#FDF5EC] text-[#C47535] dark:bg-[#2D1F13] dark:text-[#EFA66C] border-[#E89B5B]' },
  { key: 'savings', label: 'Ahorro', icon: 'pi-shield', color: '#2A8187', bg: 'bg-[#EDF9FA] text-[#2A8187] dark:bg-[#132426] dark:text-[#BFE7EA] border-[#BFE7EA]' },
] as const;

const PRESETS = [1000, 5000, 10000, 20000, 50000];

function QuickAddContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addExpenseToCategory, addIncome, cash } = useExpenseContext();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [category, setCategory] = useState<'needs' | 'wants' | 'savings'>('needs');
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // Check for URL query params (e.g. from iOS Shortcut or Action Button)
  useEffect(() => {
    const rawAmount = searchParams.get('amount') || searchParams.get('monto');
    if (!rawAmount) return;

    const parsed = parseFloat(rawAmount.replace(/[^0-9.-]+/g, ''));
    if (isNaN(parsed) || parsed <= 0) return;

    const paramType = searchParams.get('type') === 'income' ? 'income' : 'expense';
    const paramCat = (searchParams.get('category') || searchParams.get('cat') || 'needs') as 'needs' | 'wants' | 'savings';
    const paramDesc = searchParams.get('description') || searchParams.get('desc') || (paramType === 'income' ? 'Ingreso rápido' : 'Gasto rápido');

    if (searchParams.get('auto') === '1' || searchParams.get('submit') === 'true') {
      // Auto submit
      handleDirectSubmit(parsed, paramType, paramCat, paramDesc);
    } else {
      // Prefill
      setType(paramType);
      if (paramCat && ['needs', 'wants', 'savings'].includes(paramCat)) {
        setCategory(paramCat);
      }
      setAmountStr(String(parsed));
      setDescription(paramDesc);
    }
  }, [searchParams]);

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([30, 50, 30]);
      } catch {
        // Ignore if not supported
      }
    }
  };

  const handleDirectSubmit = (
    amt: number,
    recType: 'expense' | 'income',
    recCat: 'needs' | 'wants' | 'savings',
    desc: string
  ) => {
    triggerHaptic();
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (recType === 'income') {
      const newIncome: Income = {
        id,
        amount: amt,
        description: desc || 'Ingreso rápido',
        currency: 'ARS',
      };
      addIncome(newIncome);
      setSavedSuccess(`Ingreso de $${amt.toLocaleString('es-AR')} registrado con éxito.`);
    } else {
      const newExpense: Expense = {
        id,
        amount: amt,
        description: desc || 'Gasto rápido',
        currency: 'ARS',
      };
      addExpenseToCategory(recCat, newExpense);
      const catName = CATEGORIES.find(c => c.key === recCat)?.label || 'gasto';
      setSavedSuccess(`Gasto de $${amt.toLocaleString('es-AR')} guardado en ${catName}.`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = parseFloat(amountStr.replace(/[^0-9.-]+/g, ''));
    if (isNaN(numeric) || numeric <= 0) {
      toast.warning('Ingresá un monto válido.');
      return;
    }
    handleDirectSubmit(numeric, type, category, description);
  };

  const handleResetForAnother = () => {
    setSavedSuccess(null);
    setAmountStr('');
    setDescription('');
  };

  const addPreset = (val: number) => {
    const current = parseFloat(amountStr.replace(/[^0-9.-]+/g, '')) || 0;
    setAmountStr(String(current + val));
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] dark:bg-[#15110E] flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between pb-4">
        <Link
          href="/"
          className="calm-btn-secondary px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer"
        >
          <i className="pi pi-arrow-left text-xs text-[#D46743]"></i>
          <span>Calculadora</span>
        </Link>
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#9E8575] bg-white/70 dark:bg-[#1E1814] px-3 py-1 rounded-full border border-[#F0D7BC] dark:border-[#3A2E25]">
          Quick Add
        </span>
      </header>

      {/* Main card */}
      <main className="flex-1 flex flex-col justify-center py-4">
        {savedSuccess ? (
          <div className="calm-card p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-[#EDF9FA] dark:bg-[#132426] text-[#2A8187] dark:text-[#BFE7EA] rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner">
              <i className="pi pi-check font-bold"></i>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-[#2C211B] dark:text-white">¡Registrado!</h2>
              <p className="text-sm text-[#6B5547] dark:text-[#C4B1A3] font-medium max-w-xs mx-auto">
                {savedSuccess}
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleResetForAnother}
                className="calm-btn-primary w-full py-3 text-sm font-semibold cursor-pointer shadow-sm"
              >
                Registrar otro movimiento
              </button>
              <Link
                href="/"
                className="calm-btn-secondary w-full py-2.5 text-xs font-semibold text-center cursor-pointer"
              >
                Volver a la calculadora
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="calm-card p-6 sm:p-7 space-y-6">
            {/* Segmented Control: Gasto vs Ingreso */}
            <div className="calm-segmented-container">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`calm-segmented-tab ${type === 'expense' ? 'calm-segmented-tab-active' : ''}`}
              >
                Gasto
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`calm-segmented-tab ${type === 'income' ? 'calm-segmented-tab-active' : ''}`}
              >
                Ingreso
              </button>
            </div>

            {/* Big Amount Input */}
            <div className="text-center py-2">
              <label className="block text-[11px] font-semibold text-[#9E8575] uppercase tracking-wider mb-2">
                Monto
              </label>
              <div className="relative inline-flex items-center justify-center max-w-full">
                <span className="text-3xl sm:text-4xl font-bold font-mono text-[#9E8575] mr-1.5">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  placeholder="0"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-64 text-3xl sm:text-4xl font-bold font-mono text-[#2C211B] dark:text-white bg-transparent text-center focus:outline-none placeholder:text-[#9E8575]/40"
                />
              </div>
            </div>

            {/* Presets row */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => addPreset(p)}
                  className="px-3 py-1.5 text-xs font-mono font-medium bg-[#FFEAD3] dark:bg-[#261F1A] text-[#6B5547] dark:text-[#FDF6F0] hover:bg-[#F0D7BC] rounded-full transition-colors cursor-pointer"
                >
                  +${p >= 1000 ? `${p / 1000}k` : p}
                </button>
              ))}
            </div>

            {/* Category Cards (only for expenses) */}
            {type === 'expense' && (
              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-[#9E8575] uppercase tracking-wider">
                  Categoría
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setCategory(cat.key)}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? `${cat.bg} border-2 shadow-xs scale-102 font-bold`
                            : 'bg-[#FFEAD3]/40 dark:bg-[#201914]/40 border-[#F0D7BC] dark:border-[#3A2E25] text-[#6B5547] dark:text-[#C4B1A3] hover:border-[#D46743]'
                        }`}
                      >
                        <i className={`pi ${cat.icon} text-sm`}></i>
                        <span className="text-xs">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#9E8575] uppercase tracking-wider">
                Descripción (opcional)
              </label>
              <input
                type="text"
                placeholder={type === 'expense' ? 'Ej. Almuerzo, Uber, Supermercado' : 'Ej. Sueldo, Freelance, Bono'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="calm-input text-sm"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={!amountStr || parseFloat(amountStr.replace(/[^0-9.-]+/g, '')) <= 0}
              className="calm-btn-primary w-full py-3.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <i className="pi pi-check text-xs"></i>
              <span>{type === 'expense' ? 'Guardar Gasto' : 'Guardar Ingreso'}</span>
            </button>
          </form>
        )}
      </main>

      {/* Footer tips */}
      <footer className="pt-4 text-center">
        <p className="text-[11px] text-[#9E8575]">
          💡 Tip: Podés guardar esta página en la pantalla de inicio de tu iPhone tocando &quot;Compartir&quot; → &quot;Añadir a pantalla de inicio&quot;.
        </p>
      </footer>
    </div>
  );
}

export default function QuickAddPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] dark:bg-[#15110E]">
        <i className="pi pi-spin pi-spinner text-2xl text-[#D46743]"></i>
      </div>
    }>
      <QuickAddContent />
    </Suspense>
  );
}
