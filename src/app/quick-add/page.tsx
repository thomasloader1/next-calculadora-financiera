'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Expense } from '@/interfaces/Expense';
import { Income } from '@/interfaces/Income';
import { toast } from 'sonner';
import Link from 'next/link';
import { parseAmount, validateAmount, validateDescription, isStorableAmount, MAX_DESCRIPTION } from '@/lib/validation';
import { useFieldErrors } from '@/hooks/useFieldErrors';

const CATEGORIES = [
  { key: 'needs', label: 'Necesidad', icon: 'pi-home' },
  { key: 'wants', label: 'Imprevistos', icon: 'pi-bolt' },
  { key: 'savings', label: 'Ahorro', icon: 'pi-shield' },
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

    const parsed = parseAmount(rawAmount);
    if (!isStorableAmount(parsed)) {
      toast.error('El monto del enlace no es válido. Revisalo y cargalo a mano.');
      return;
    }

    const paramType = searchParams.get('type') === 'income' ? 'income' : 'expense';
    const rawCat = searchParams.get('category') || searchParams.get('cat') || 'needs';
    const paramCat = (['needs', 'wants', 'savings'].includes(rawCat) ? rawCat : 'needs') as 'needs' | 'wants' | 'savings';
    const paramDesc = (searchParams.get('description') || searchParams.get('desc') || (paramType === 'income' ? 'Ingreso rápido' : 'Gasto rápido'))
      .trim()
      .slice(0, MAX_DESCRIPTION);

    if (searchParams.get('auto') === '1' || searchParams.get('submit') === 'true') {
      // Auto submit
      handleDirectSubmit(parsed, paramType, paramCat, paramDesc);
    } else {
      // Prefill
      setType(paramType);
      if (paramCat && ['needs', 'wants', 'savings'].includes(paramCat)) {
        setCategory(paramCat);
      }
      setAmountStr(parsed.toLocaleString('es-AR', { maximumFractionDigits: 2 }));
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

  const { shown, touch, attempt, reset } = useFieldErrors<'amount' | 'description'>();
  const amountError = validateAmount(amountStr);
  const descriptionError = validateDescription(description);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attempt([amountError, descriptionError])) {
      document.getElementById(amountError ? 'quick-amount' : 'quick-desc')?.focus();
      return;
    }
    handleDirectSubmit(parseAmount(amountStr), type, category, description.trim());
  };

  const handleResetForAnother = () => {
    setSavedSuccess(null);
    setAmountStr('');
    setDescription('');
    reset();
  };

  const addPreset = (val: number) => {
    const current = parseAmount(amountStr);
    const next = (Number.isNaN(current) ? 0 : current) + val;
    setAmountStr(next.toLocaleString('es-AR', { maximumFractionDigits: 2 }));
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col p-4 sm:p-6 max-w-lg mx-auto">
      <header className="flex items-center justify-between gap-3 pb-4">
        <Link href="/" className="calm-btn-secondary">
          <i className="pi pi-arrow-left text-xs" aria-hidden="true"></i>
          <span>Calculadora</span>
        </Link>
        <h1 className="text-lg text-ink">Quick Add</h1>
      </header>

      <main className="flex-1 flex flex-col justify-center py-4">
        {savedSuccess ? (
          <div className="calm-card p-8 text-center space-y-6" role="status">
            <div className="w-14 h-14 bg-accent-soft text-accent-deep rounded-full flex items-center justify-center mx-auto text-xl">
              <i className="pi pi-check" aria-hidden="true"></i>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl text-ink">¡Registrado!</h2>
              <p className="text-base text-ink-2 max-w-xs mx-auto">{savedSuccess}</p>
            </div>
            <div className="pt-2 flex flex-col gap-3">
              <button type="button" onClick={handleResetForAnother} className="calm-btn-primary w-full min-h-[52px] text-base">
                Registrar otro movimiento
              </button>
              <Link href="/" className="calm-btn-secondary w-full min-h-[48px]">
                Volver a la calculadora
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="calm-card p-5 sm:p-7 space-y-6">
            <div className="calm-segmented-container" role="group" aria-label="Tipo de movimiento">
              <button
                type="button"
                onClick={() => setType('expense')}
                aria-pressed={type === 'expense'}
                className={`calm-segmented-tab min-h-[44px] ${type === 'expense' ? 'calm-segmented-tab-active' : ''}`}
              >
                Gasto
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                aria-pressed={type === 'income'}
                className={`calm-segmented-tab min-h-[44px] ${type === 'income' ? 'calm-segmented-tab-active' : ''}`}
              >
                Ingreso
              </button>
            </div>

            {/* The amount, set big */}
            <div>
              <label htmlFor="quick-amount" className="block text-sm font-medium text-ink-2 mb-2">Monto</label>
              <div className={`flex items-baseline gap-2 border-b-2 pb-2 ${shown('amount', amountError) ? 'border-error' : 'border-rule focus-within:border-accent'}`}>
                <span className="font-display font-bold text-4xl text-muted" aria-hidden="true">$</span>
                <input
                  id="quick-amount"
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  autoFocus
                  placeholder="0"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  onBlur={touch('amount')}
                  aria-invalid={shown('amount', amountError) ? true : undefined}
                  aria-describedby={shown('amount', amountError) ? 'quick-amount-error' : undefined}
                  className="w-full min-w-0 font-display font-bold text-5xl tracking-tight text-ink bg-transparent focus:outline-none placeholder:text-muted/50"
                />
              </div>
              {shown('amount', amountError) && (
                <p id="quick-amount-error" role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-error">
                  <i className="pi pi-exclamation-circle text-xs mt-1" aria-hidden="true"></i>
                  <span>{amountError}</span>
                </p>
              )}
              <div className="mt-3 grid grid-cols-5 gap-1.5" role="group" aria-label="Sumar monto rápido">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => addPreset(p)}
                    className="calm-btn-secondary min-h-[40px] px-0 tabular-nums"
                  >
                    +${p >= 1000 ? `${p / 1000}k` : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Category: three plastic keys */}
            {type === 'expense' && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-ink-2 mb-2">Categoría</legend>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setCategory(cat.key)}
                        aria-pressed={isSelected}
                        className={`plastic plastic--${cat.key} min-h-[72px] px-2 py-3 flex flex-col items-center justify-center gap-1.5 text-ink cursor-pointer transition-transform duration-micro ${
                          isSelected ? 'outline outline-2 outline-ink -outline-offset-2' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <i className={`pi ${isSelected ? 'pi-check' : cat.icon} text-sm`} aria-hidden="true"></i>
                        <span className="text-sm font-medium">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div className="space-y-1.5">
              <label htmlFor="quick-desc" className="block text-sm font-medium text-ink-2">Descripción (opcional)</label>
              <input
                id="quick-desc"
                name="description"
                type="text"
                autoComplete="off"
                placeholder={type === 'expense' ? 'Ej. Almuerzo, Uber, Supermercado' : 'Ej. Sueldo, Freelance, Bono'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={touch('description')}
                maxLength={MAX_DESCRIPTION + 20}
                aria-invalid={shown('description', descriptionError) ? true : undefined}
                aria-describedby={shown('description', descriptionError) ? 'quick-desc-error' : undefined}
                className="calm-input"
              />
              {shown('description', descriptionError) && (
                <p id="quick-desc-error" role="alert" className="flex items-start gap-1.5 text-sm text-error">
                  <i className="pi pi-exclamation-circle text-xs mt-1" aria-hidden="true"></i>
                  <span>{descriptionError}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
className="calm-btn-primary w-full min-h-[52px] text-base"
            >
              <i className="pi pi-check text-sm" aria-hidden="true"></i>
              <span>{type === 'expense' ? 'Guardar gasto' : 'Guardar ingreso'}</span>
            </button>
          </form>
        )}
      </main>

      <footer className="pt-4">
        <p className="text-sm text-muted text-center">
          Podés guardar esta página en la pantalla de inicio de tu iPhone tocando &quot;Compartir&quot; y después &quot;Añadir a pantalla de inicio&quot;.
        </p>
      </footer>
    </div>
  );
}

export default function QuickAddPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <i className="pi pi-spin pi-spinner text-2xl text-accent" aria-hidden="true"></i>
      </div>
    }>
      <QuickAddContent />
    </Suspense>
  );
}
