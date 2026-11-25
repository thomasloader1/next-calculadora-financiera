'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ExpenseList from './ExpenseList';
import IncomeForm from './IncomeForm';
import IncomeList from './IncomeList';
import TransferList from './TransferList';
import { Modal } from '@/components/ui/Modal';
import { VolumeKnob, type KnobVariant } from '@/components/ui/VolumeKnob';
import dynamic from 'next/dynamic';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { useAuthContext } from '@/context/Auth/AuthContext';
import { autoAdjustSplit } from '@/lib/budgetCalculator';
import { ExcelButtons } from './ExcelButtons';
import { formatAmount } from '@/lib/formatAmount';
import { IPhoneIntegrationModal } from './IPhoneIntegrationModal';
import { MobileBottomNav } from './MobileBottomNav';
import type { CategoryKey } from '@/interfaces/Transfer';
import { toast } from 'sonner';

const LazyExpenseModal = dynamic(() => import('./ExpenseModal'), { ssr: false });

const HIDE_BALANCE_KEY = 'calc:hide-available-balance';

const CATEGORY_LABELS: Record<string, string> = {
  needs: 'Necesidades',
  wants: 'Imprevistos',
  savings: 'Ahorro',
};

const Calculator: React.FC = () => {
  const {
    needs, wants, savings, cash,
    incomes, globalSplit, setGlobalSplit,
    recalculateBudgets, isLoading, isInitialLoading,
  } = useExpenseContext();
  const { loading: authLoading } = useAuthContext();

  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseModalCategory, setExpenseModalCategory] = useState<string>('');
  const [expenseModalTab, setExpenseModalTab] = useState<'gastos' | 'transferencias'>('gastos');

  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [widgetModalTab, setWidgetModalTab] = useState<'widget' | 'android' | 'shortcut'>('widget');
  const [hideBalance, setHideBalance] = useState(false);

  useEffect(() => {
    try {
      setHideBalance(localStorage.getItem(HIDE_BALANCE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  const toggleHideBalance = () => {
    setHideBalance(prev => {
      const next = !prev;
      try {
        localStorage.setItem(HIDE_BALANCE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    if (incomes.length > 0) {
      recalculateBudgets();
    }
  }, [incomes, globalSplit, recalculateBudgets]);

  const hasIncomes = incomes.length > 0;
  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalSpent = [...needs, ...wants, ...savings]
    .filter(e => !e.isTransfer)
    .reduce((sum, e) => sum + e.amount, 0);
  const totalAvailable = (cash?.needs ?? 0) + (cash?.wants ?? 0) + (cash?.savings ?? 0);

  const handleSplitChange = useCallback((category: CategoryKey, newPercent: number) => {
    const nextSplit = autoAdjustSplit(category, newPercent, globalSplit);
    setGlobalSplit(nextSplit);
  }, [globalSplit, setGlobalSplit]);

  const handleAddExpense = (category: string) => {
    setExpenseModalCategory(category);
    setExpenseModalTab('gastos');
    setShowExpenseModal(true);
  };

  const handleOpenTransfers = () => {
    setExpenseModalCategory('');
    setExpenseModalTab('transferencias');
    setShowExpenseModal(true);
  };

  // Global keyboard shortcuts (N: expense, I: income, T: transfers)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return;
      }
      if (showIncomeModal || showExpenseModal || showWidgetModal) {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleAddExpense('needs');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setShowIncomeModal(true);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        handleOpenTransfers();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showIncomeModal, showExpenseModal, showWidgetModal]);

  // Full-screen loader while initial data is being fetched
  if (!authLoading && isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3" role="status">
        <i className="pi pi-spin pi-spinner text-2xl text-accent" aria-hidden="true"></i>
        <p className="text-sm text-muted">Cargando tu información financiera…</p>
      </div>
    );
  }

  const buckets: { key: CategoryKey; expenses: typeof needs; cash: number; pool?: number; percent: number }[] = cash ? [
    { key: 'needs', expenses: needs, cash: cash.needs, pool: cash.pool?.needs, percent: globalSplit.needs },
    { key: 'wants', expenses: wants, cash: cash.wants, pool: cash.pool?.wants, percent: globalSplit.wants },
    { key: 'savings', expenses: savings, cash: cash.savings, pool: cash.pool?.savings, percent: globalSplit.savings },
  ] : [];

  const previews: { key: CategoryKey; percent: number; label: string; text: string }[] = [
    { key: 'needs', percent: globalSplit.needs, label: 'Necesidades', text: 'Alquiler, comida, servicios esenciales y gastos indispensables.' },
    { key: 'wants', percent: globalSplit.wants, label: 'Imprevistos', text: 'Salidas, entretenimiento, compras no esenciales y emergencias.' },
    { key: 'savings', percent: globalSplit.savings, label: 'Ahorro', text: 'Inversiones, fondo de reserva y metas financieras futuras.' },
  ];

  const hiddenMask = (
    <>
      <span aria-hidden="true">••••••</span>
      <span className="sr-only">Dato oculto</span>
    </>
  );

  return (
    <div className="space-y-6 pb-28 sm:pb-8">
      {/* ── The month at a glance: always present, hides all data on toggle ── */}
      <section aria-label="Resumen del mes" className="calm-card p-5 sm:p-6">
        <dl className="grid grid-cols-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-6 gap-y-4">
          {/* Column 1: Saldo disponible */}
          <div className="col-span-2 sm:col-span-1">
            <dt className="flex items-center gap-1.5 text-sm text-muted">
              <span>Saldo disponible</span>
              <button
                type="button"
                onClick={toggleHideBalance}
                aria-label={hideBalance ? 'Mostrar datos del resumen' : 'Ocultar datos del resumen'}
                aria-pressed={hideBalance}
                title={hideBalance ? 'Mostrar datos del resumen' : 'Ocultar datos del resumen'}
                className="w-8 h-8 -my-1.5 rounded-input inline-flex items-center justify-center text-muted hover:text-ink hover:bg-paper-3 transition-colors cursor-pointer"
              >
                <i className={`pi ${hideBalance ? 'pi-eye-slash' : 'pi-eye'} text-sm`} aria-hidden="true"></i>
              </button>
            </dt>
            <dd className={`mt-1 font-display font-bold text-4xl lg:text-5xl leading-none tracking-tight break-words ${
              hideBalance || !hasIncomes
                ? 'text-muted select-none'
                : totalAvailable >= 0
                  ? 'text-accent'
                  : 'text-error'
            }`}>
              {hideBalance ? hiddenMask : formatAmount(totalAvailable)}
            </dd>
            <dd className="mt-2 text-sm text-muted">
              {hideBalance
                ? 'Datos del resumen ocultos'
                : !hasIncomes
                  ? 'Cargá un ingreso para distribuir tu presupuesto'
                  : totalAvailable >= 0
                    ? 'Remanente en tus fondos'
                    : 'Sobregiro neto total'}
            </dd>
          </div>

          {/* Column 2: Ingreso total + interactive income sources / empty load button */}
          <div className="sm:border-l sm:border-rule sm:pl-6">
            <dt className="text-sm text-muted">Ingreso total</dt>
            <dd className={`mt-1 font-display font-bold text-xl sm:text-2xl tracking-tight ${
              hideBalance || !hasIncomes ? 'text-muted select-none' : 'text-ink'
            }`}>
              {hideBalance ? hiddenMask : formatAmount(totalIncome)}
            </dd>
            <dd className="mt-1.5">
              {hasIncomes ? (
                <button
                  type="button"
                  onClick={() => setShowIncomeModal(true)}
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-deep rounded-input py-0.5 pr-2 -ml-1.5 pl-1.5 hover:bg-paper-2 transition-colors cursor-pointer"
                >
                  <span>
                    {hideBalance
                      ? 'Fuentes de ingreso'
                      : `${incomes.length} ${incomes.length === 1 ? 'fuente de ingreso' : 'fuentes de ingreso'}`}
                  </span>
                  <i
                    className="pi pi-chevron-right text-[10px] transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  ></i>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowIncomeModal(true)}
                  className="calm-btn-primary mt-0.5 min-h-[36px] px-3 text-sm"
                >
                  <i className="pi pi-plus text-xs" aria-hidden="true"></i>
                  <span>Cargar ingreso</span>
                </button>
              )}
            </dd>
          </div>

          {/* Column 3: Total gastado */}
          <div className="sm:border-l sm:border-rule sm:pl-6">
            <dt className="text-sm text-muted">Total gastado</dt>
            <dd className={`mt-1 font-display font-bold text-xl sm:text-2xl tracking-tight ${
              hideBalance || (!hasIncomes && totalSpent === 0) ? 'text-muted select-none' : 'text-ink'
            }`}>
              {hideBalance ? hiddenMask : formatAmount(totalSpent)}
            </dd>
            <dd className="mt-1.5 text-sm text-muted">
              {hideBalance
                ? '••% de tu ingreso'
                : !hasIncomes
                  ? 'Sin ingresos registrados'
                  : totalIncome > 0
                    ? `${Math.round((totalSpent / totalIncome) * 100)}% de tu ingreso`
                    : '0%'}
            </dd>
          </div>
        </dl>
      </section>

      {/* ── The three compartments ── */}
      {cash && !isLoading ? (
        <section aria-label="Fondos del mes" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {buckets.map(b => (
            <ExpenseList
              key={b.key}
              categoryKey={b.key}
              label={CATEGORY_LABELS[b.key]}
              expenses={b.expenses}
              cash={b.cash}
              poolAmount={b.pool}
              percent={b.percent}
              onPercentChange={(val) => handleSplitChange(b.key, val)}
              onAddExpense={handleAddExpense}
            />
          ))}
        </section>
      ) : !hasIncomes && !isLoading ? (
        <section aria-label="Cómo se divide tu ingreso" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {previews.map(p => (
            <div key={p.key} className={`plastic plastic--${p.key} p-5`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base text-ink">{p.label}</h2>
                <VolumeKnob
                  value={p.percent}
                  onChange={(val) => handleSplitChange(p.key, val)}
                  label={p.label}
                  variant={p.key as KnobVariant}
                />
              </div>
              <p className="mt-2 text-sm text-ink-2">{p.text}</p>
            </div>
          ))}
        </section>
      ) : null}

      {/* Skeletons while changing months */}
      {cash && isLoading && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-busy="true" aria-label="Cargando fondos">
          {[1, 2, 3].map(i => (
            <div key={i} className="calm-card p-2 animate-pulse">
              <div className="rounded-input bg-paper-3 p-5 space-y-3">
                <div className="h-4 w-28 bg-rule rounded" />
                <div className="h-8 w-40 bg-rule rounded" />
                <div className="h-2 w-full bg-rule rounded-full" />
              </div>
              <div className="p-3 space-y-2">
                <div className="h-8 w-full bg-paper-2 rounded" />
                <div className="h-8 w-4/5 bg-paper-2 rounded" />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Unified Incomes Modal (list + quick-add) ── */}
      <Modal
        isOpen={showIncomeModal}
        onClose={() => setShowIncomeModal(false)}
        title={hasIncomes ? 'Fuentes de ingreso' : 'Cargar ingreso'}
      >
        <div className="space-y-5">
          {hasIncomes && <IncomeList />}
          <div className={hasIncomes ? 'border-t border-rule pt-4' : ''}>
            <IncomeForm
              compact={hasIncomes}
              onAdded={() => {
                if (!hasIncomes) {
                  setShowIncomeModal(false);
                  toast.success('Ingreso cargado');
                } else {
                  toast.success('Ingreso agregado');
                }
              }}
            />
          </div>
        </div>
      </Modal>

      {cash && <TransferList />}

      {/* ── Tools ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={handleOpenTransfers} className="calm-btn-secondary">
          <i className="pi pi-exchange-alt text-xs" aria-hidden="true"></i>
          <span>Transferir entre fondos</span>
          <kbd className="hidden sm:inline-block text-xs text-muted">T</kbd>
        </button>
        <ExcelButtons showExport={!!cash && !isLoading} />
      </div>

      {/* ── Keyboard shortcuts ── */}
      <footer className="pt-6 border-t border-rule hidden sm:flex flex-wrap items-center justify-between gap-4 text-sm text-muted">
        <p>Calculadora de presupuesto 50/30/20</p>
        <ul className="flex flex-wrap items-center gap-5" aria-label="Atajos de teclado">
          <li className="flex items-center gap-2"><kbd className="text-xs border border-rule rounded px-1.5 bg-surface">N</kbd>nuevo gasto</li>
          <li className="flex items-center gap-2"><kbd className="text-xs border border-rule rounded px-1.5 bg-surface">I</kbd>ingresos</li>
          <li className="flex items-center gap-2"><kbd className="text-xs border border-rule rounded px-1.5 bg-surface">T</kbd>transferir</li>
        </ul>
      </footer>

      <LazyExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        defaultCategory={expenseModalCategory}
        defaultTab={expenseModalTab}
      />

      <IPhoneIntegrationModal
        isOpen={showWidgetModal}
        onClose={() => setShowWidgetModal(false)}
        initialTab={widgetModalTab}
      />

      <MobileBottomNav
        onAddExpense={() => handleAddExpense('needs')}
        onAddIncome={() => setShowIncomeModal(true)}
        onOpenTransfers={handleOpenTransfers}
        onOpenWidgetModal={() => {
          setWidgetModalTab('widget');
          setShowWidgetModal(true);
        }}
      />
    </div>
  );
};

export default Calculator;
