'use client';

import React, { useEffect, useState } from 'react';
import ExpenseList from './ExpenseList';
import IncomeForm from './IncomeForm';
import IncomeList from './IncomeList';
import SplitEditor from './SplitEditor';
import TransferList from './TransferList';
import { Modal } from '@/components/ui/Modal';
import dynamic from 'next/dynamic';
import IncomeFormModal from './IncomeForm';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { useAuthContext } from '@/context/Auth/AuthContext';
import { calculateEffectivePercentages } from '@/lib/budgetCalculator';
import { ExcelButtons } from './ExcelButtons';
import { formatAmount } from '@/lib/formatAmount';
import { InstallPromptBanner } from './InstallPromptBanner';
import { LocalModeBanner } from './LocalModeBanner';
import { IPhoneIntegrationModal } from './IPhoneIntegrationModal';
import { MobileBottomNav } from './MobileBottomNav';

const LazyExpenseModal = dynamic(() => import('./ExpenseModal'), { ssr: false });

const CATEGORY_LABELS: Record<string, string> = {
  needs: 'Necesidades',
  wants: 'Imprevistos',
  savings: 'Ahorro',
};

const Calculator: React.FC = () => {
  const {
    needs, wants, savings, cash,
    incomes, transfers, globalSplit,
    recalculateBudgets, isLoading, isInitialLoading,
  } = useExpenseContext();
  const { user, loading: authLoading } = useAuthContext();

  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseModalCategory, setExpenseModalCategory] = useState<string>('');
  const [expenseModalTab, setExpenseModalTab] = useState<'gastos' | 'transferencias'>('gastos');

  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [widgetModalTab, setWidgetModalTab] = useState<'widget' | 'android' | 'shortcut'>('widget');

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

  const effectivePercent = cash?.pool
    ? calculateEffectivePercentages(cash.pool, totalIncome)
    : globalSplit;

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
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <i className="pi pi-spin pi-spinner text-2xl text-[#D46743]"></i>
        <p className="text-xs font-medium text-[#6B5547]">Cargando tu información financiera...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 sm:pb-8">
      {/* ── 0a. Local (no session) data warning + backup ── */}
      <LocalModeBanner />

      {/* ── 0. Browser Install & Widget Prompt Banner ── */}
      <InstallPromptBanner
        onOpenWidgetModal={(tab) => {
          setWidgetModalTab(tab || 'widget');
          setShowWidgetModal(true);
        }}
      />

      {/* ── 1. Top Financial Overview Hero (Item 06 Pillowy Cards) ── */}
      {hasIncomes && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-200">
          {/* Total Income */}
          <div className="calm-card p-5 sm:p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#6B5547] dark:text-[#C4B1A3] uppercase tracking-wider">
                Ingreso Total
              </span>
              <span className="w-8 h-8 rounded-full bg-[#FCEEE9] dark:bg-[#301C15] text-[#D46743] dark:text-[#E28669] flex items-center justify-center text-xs shadow-2xs">
                <i className="pi pi-arrow-down-left"></i>
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[#2C211B] dark:text-white tracking-tight">
              {formatAmount(totalIncome)}
            </div>
            <p className="text-[11px] text-[#9E8575] mt-1.5">
              {incomes.length} {incomes.length === 1 ? 'fuente de ingreso' : 'fuentes de ingreso'}
            </p>
          </div>

          {/* Available Cash */}
          <div className="calm-card p-5 sm:p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#6B5547] dark:text-[#C4B1A3] uppercase tracking-wider">
                Saldo Disponible
              </span>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-2xs ${
                totalAvailable >= 0
                  ? 'bg-[#EDF9FA] dark:bg-[#132426] text-[#2A8187] dark:text-[#BFE7EA]'
                  : 'bg-red-50 dark:bg-red-950/40 text-[#D46743]'
              }`}>
                <i className={`pi ${totalAvailable >= 0 ? 'pi-wallet' : 'pi-exclamation-triangle'}`}></i>
              </span>
            </div>
            <div className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight ${
              totalAvailable >= 0 ? 'text-[#2A8187] dark:text-[#BFE7EA]' : 'text-[#D46743]'
            }`}>
              {formatAmount(totalAvailable)}
            </div>
            <p className="text-[11px] text-[#9E8575] mt-1.5">
              {totalAvailable >= 0 ? 'Remanente en tus fondos' : 'Sobregiro neto total'}
            </p>
          </div>

          {/* Total Spent */}
          <div className="calm-card p-5 sm:p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#6B5547] dark:text-[#C4B1A3] uppercase tracking-wider">
                Total Gastado
              </span>
              <span className="w-8 h-8 rounded-full bg-[#FDF5EC] dark:bg-[#2D1F13] text-[#E89B5B] flex items-center justify-center text-xs shadow-2xs">
                <i className="pi pi-receipt"></i>
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[#2C211B] dark:text-white tracking-tight">
              {formatAmount(totalSpent)}
            </div>
            <p className="text-[11px] text-[#8A9A8E] mt-1.5">
              {totalIncome > 0 ? `${Math.round((totalSpent / totalIncome) * 100)}% de tu ingreso` : '0%'}
            </p>
          </div>
        </section>
      )}

      {/* ── 2. Interactive Budget Distribution (50/30/20 Segmented Bar) ── */}
      {cash && !isLoading && <SplitEditor />}

      {/* ── 3. Incomes Section ── */}
      <section>
        {!hasIncomes ? (
          <div className="space-y-4">
            <div className="text-center sm:text-left">
              <h2 className="text-lg font-bold text-[#232B25] dark:text-white">
                Comencemos por tu ingreso mensual
              </h2>
              <p className="text-xs text-[#5F6F63] dark:text-[#A3B4A5] mt-1">
                Ingresá tu sueldo o ingresos para dividirlos automáticamente en Necesidades (50%), Imprevistos (30%) y Ahorro (20%):
              </p>
            </div>
            <IncomeForm />
          </div>
        ) : (
          <div className="calm-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[#F0D7BC] dark:border-[#3A2E25]">
              <IncomeList />
            </div>
            <div className="px-5 py-3.5 bg-[#FFEAD3]/40 dark:bg-[#1A1410]/40 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowIncomeModal(true)}
                className="text-xs font-semibold text-[#D46743] dark:text-[#E28669] hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <i className="pi pi-plus text-[10px]"></i>
                <span>Agregar otro ingreso</span>
              </button>
              <kbd className="text-[10px] font-mono text-[#9E8575] bg-white dark:bg-[#1E1814] border border-[#F0D7BC] dark:border-[#3A2E25] px-2 py-0.5 rounded-full shadow-2xs">
                I
              </kbd>
            </div>
          </div>
        )}
      </section>

      {/* ── Income Modal ── */}
      <Modal
        isOpen={showIncomeModal}
        onClose={() => setShowIncomeModal(false)}
        title="Agregar nuevo ingreso"
      >
        <IncomeFormModal onAdded={() => setShowIncomeModal(false)} />
      </Modal>

      {/* ── 4. The 3 Core Category Cards (Necesidades, Imprevistos, Ahorro) ── */}
      {cash && !isLoading ? (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in duration-200">
          <ExpenseList
            categoryKey="needs"
            label={CATEGORY_LABELS.needs}
            expenses={needs}
            cash={cash.needs}
            poolAmount={cash.pool?.needs}
            percent={effectivePercent.needs}
            onAddExpense={handleAddExpense}
          />
          <ExpenseList
            categoryKey="wants"
            label={CATEGORY_LABELS.wants}
            expenses={wants}
            cash={cash.wants}
            poolAmount={cash.pool?.wants}
            percent={effectivePercent.wants}
            onAddExpense={handleAddExpense}
          />
          <ExpenseList
            categoryKey="savings"
            label={CATEGORY_LABELS.savings}
            expenses={savings}
            cash={cash.savings}
            poolAmount={cash.pool?.savings}
            percent={effectivePercent.savings}
            onAddExpense={handleAddExpense}
          />
        </section>
      ) : !hasIncomes && !isLoading ? (
        /* Preview Cards showing 50/30/20 division before income is entered */
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="calm-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-full bg-[#FCEEE9] dark:bg-[#301C15] text-[#D46743] dark:text-[#E28669] flex items-center justify-center text-xs font-bold">
                50%
              </span>
              <span className="text-[11px] font-semibold text-[#9E8575] uppercase tracking-wider">
                Presupuesto Fijo
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2C211B] dark:text-white">Necesidades</h3>
              <p className="text-xs text-[#6B5547] dark:text-[#C4B1A3] mt-1">
                Alquiler, comida, servicios esenciales y gastos indispensables.
              </p>
            </div>
            <div className="pt-2 text-2xl font-bold font-mono text-[#E89B5B]">
              $0
            </div>
          </div>

          <div className="calm-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-full bg-[#FDF5EC] dark:bg-[#2D1F13] text-[#C47535] dark:text-[#EFA66C] flex items-center justify-center text-xs font-bold">
                30%
              </span>
              <span className="text-[11px] font-semibold text-[#9E8575] uppercase tracking-wider">
                Presupuesto Flexible
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2C211B] dark:text-white">Imprevistos</h3>
              <p className="text-xs text-[#6B5547] dark:text-[#C4B1A3] mt-1">
                Salidas, entretenimiento, compras no esenciales y emergencias.
              </p>
            </div>
            <div className="pt-2 text-2xl font-bold font-mono text-[#E89B5B]">
              $0
            </div>
          </div>

          <div className="calm-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-full bg-[#EDF9FA] dark:bg-[#132426] text-[#2A8187] dark:text-[#BFE7EA] flex items-center justify-center text-xs font-bold">
                20%
              </span>
              <span className="text-[11px] font-semibold text-[#9E8575] uppercase tracking-wider">
                Presupuesto Futuro
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#2C211B] dark:text-white">Ahorro</h3>
              <p className="text-xs text-[#6B5547] dark:text-[#C4B1A3] mt-1">
                Inversiones, fondo de reserva y metas financieras futuras.
              </p>
            </div>
            <div className="pt-2 text-2xl font-bold font-mono text-[#E89B5B]">
              $0
            </div>
          </div>
        </section>
      ) : null}

      {/* Skeletons while changing months */}
      {cash && isLoading && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="calm-card p-6 space-y-3 animate-pulse">
              <div className="h-4 w-28 bg-[#F0D7BC] dark:bg-[#3A2E25] rounded-md" />
              <div className="h-7 w-36 bg-[#F0D7BC] dark:bg-[#3A2E25] rounded-md" />
              <div className="h-2 w-full bg-[#F0D7BC] dark:bg-[#3A2E25] rounded-full" />
              <div className="space-y-2 pt-2">
                <div className="h-8 w-full bg-[#FFEAD3] dark:bg-[#261F1A] rounded-xl" />
                <div className="h-8 w-4/5 bg-[#FFEAD3] dark:bg-[#261F1A] rounded-xl" />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── 5. Transfers Section ── */}
      {cash && <TransferList />}

      {/* ── 6. Export / Import Dropdown Bar ── */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleOpenTransfers}
          className="text-xs font-semibold text-[#6B5547] hover:text-[#2C211B] dark:text-[#C4B1A3] dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <i className="pi pi-exchange-alt text-xs text-[#D46743]"></i>
          <span>Transferir entre fondos</span>
          <kbd className="text-[10px] font-mono text-[#9E8575] bg-white dark:bg-[#1E1814] border border-[#F0D7BC] dark:border-[#3A2E25] px-1.5 py-0.2 rounded-full">T</kbd>
        </button>

        <ExcelButtons showExport={!!cash && !isLoading} />
      </div>

      {/* ── Footer with Keyboard Shortcuts ── */}
      <footer className="mt-12 pt-6 border-t border-[#F0D7BC] dark:border-[#3A2E25] text-center flex flex-col items-center gap-2.5">
        <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-[#9E8575] font-mono">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 bg-white dark:bg-[#1E1814] border border-[#F0D7BC] dark:border-[#3A2E25] rounded-full text-[10px] shadow-2xs">N</kbd>
            <span>nuevo gasto</span>
          </span>
          <span className="text-[#E89B5B]">·</span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 bg-white dark:bg-[#1E1814] border border-[#F0D7BC] dark:border-[#3A2E25] rounded-full text-[10px] shadow-2xs">I</kbd>
            <span>nuevo ingreso</span>
          </span>
          <span className="text-[#E89B5B]">·</span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 bg-white dark:bg-[#1E1814] border border-[#F0D7BC] dark:border-[#3A2E25] rounded-full text-[10px] shadow-2xs">T</kbd>
            <span>transferir</span>
          </span>
        </div>
        <p className="text-xs text-[#9E8575]">
          Calculadora de Presupuesto 50/30/20 · Estilo Calm Kit
        </p>
      </footer>

      {/* Expense Modal */}
      <LazyExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        defaultCategory={expenseModalCategory}
        defaultTab={expenseModalTab}
      />

      {/* Mobile Widget & Shortcut Modal */}
      <IPhoneIntegrationModal
        isOpen={showWidgetModal}
        onClose={() => setShowWidgetModal(false)}
        initialTab={widgetModalTab}
      />

      {/* Mobile Bottom Navigation (Item 10 in study) */}
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
