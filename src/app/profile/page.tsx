'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/context/Auth/AuthContext';
import { loadUserProfile, saveUserProfile, getUserMonths, loadMonthBudget, computeBalance } from '@/Services/firebase';
import { nameToColor, getInitial } from '@/utils/avatar';
import { MonthBudget } from '@/interfaces/Expense';
import { toast } from 'sonner';
import { MaskedInput } from '@/components/ui/MaskedInput';
import { parseDateDMY, formatDateISOtoDMY } from '@/lib/formatAmount';
import { IPhoneIntegrationModal } from '@/components/IPhoneIntegrationModal';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

interface MonthData {
  id: string;
  budget: MonthBudget;
  balance: number;
}

export default function ProfilePage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  const [birthDate, setBirthDate] = useState('');
  const [profileBirthDate, setProfileBirthDate] = useState<string | null>(null);
  const [savingDate, setSavingDate] = useState(false);
  const [dateError, setDateError] = useState('');
  const [months, setMonths] = useState<MonthData[]>([]);
  const [monthsLoading, setMonthsLoading] = useState(true);
  const [showIPhoneModal, setShowIPhoneModal] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  // Load profile and months
  const loadData = useCallback(async () => {
    if (!user) return;

    const profile = await loadUserProfile(user.uid);
    if (profile?.birthDate) {
      setProfileBirthDate(profile.birthDate);
      setBirthDate(formatDateISOtoDMY(profile.birthDate));
    }

    const monthIds = await getUserMonths(user.uid);
    if (monthIds.length === 0) {
      setMonthsLoading(false);
      return;
    }

    const results = await Promise.allSettled(
      monthIds.map(async (monthId) => {
        const budget = await loadMonthBudget(user.uid, monthId);
        if (!budget) return null;
        return {
          id: monthId,
          budget,
          balance: computeBalance(budget.cash, budget.needs, budget.wants, budget.savings),
        };
      })
    );

    const valid = results
      .filter((r): r is PromiseFulfilledResult<MonthData | null> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((v): v is MonthData => v !== null);

    setMonths(valid);
    setMonthsLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleSaveDate = async () => {
    if (!user) return;
    setDateError('');

    if (!birthDate || birthDate.length < 10) {
      setDateError('Ingresa una fecha válida (DD/MM/AAAA)');
      return;
    }

    const parts = birthDate.split('/');
    if (parts.length !== 3) {
      setDateError('Formato inválido. Usá DD/MM/AAAA');
      return;
    }
    const [dayStr, monthStr, yearStr] = parts;
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const year = parseInt(yearStr, 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      setDateError('Fecha inválida');
      return;
    }

    const selected = new Date(year, month, day);
    if (selected.getDate() !== day || selected.getMonth() !== month) {
      setDateError('Fecha inválida');
      return;
    }

    if (selected > new Date()) {
      setDateError('La fecha no puede ser en el futuro');
      return;
    }

    setSavingDate(true);
    try {
      const isoDate = parseDateDMY(birthDate);
      await saveUserProfile(user.uid, { birthDate: isoDate });
      setProfileBirthDate(isoDate);
      toast.success('Fecha de nacimiento guardada');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSavingDate(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0] dark:bg-[#15110E]">
        <i className="pi pi-spin pi-spinner text-2xl text-[#D46743]"></i>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] dark:bg-[#15110E] flex flex-col pb-12">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#FAF6F0]/90 dark:bg-[#15110E]/90 backdrop-blur-md border-b border-[#F0D7BC] dark:border-[#3A2E25]">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="calm-btn-secondary px-3.5 py-1.5 text-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <i className="pi pi-arrow-left text-xs text-[#D46743]"></i>
            <span>Volver a la calculadora</span>
          </button>
          <span className="text-xs font-semibold text-[#9E8575] font-mono uppercase tracking-wider bg-white/70 dark:bg-[#1A201C] px-3 py-1 rounded-full border border-[#F0D7BC] dark:border-[#3A2E25]">
            Mi Perfil
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6 w-full flex-1">
        {/* User Card - Item 06 Profile Card Aesthetic */}
        <section className="calm-card p-6 sm:p-7">
          <div className="flex items-center gap-4">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || user.email || ''}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-[#D46743]/30"
              />
            ) : (
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-sm ${nameToColor(user.displayName || user.email || '')}`}
              >
                {getInitial(user.displayName || user.email)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#2C332D] dark:text-white truncate">
                {user.displayName || 'Usuario'}
              </h1>
              <p className="text-xs text-[#9E8575] truncate">{user.email}</p>
            </div>
          </div>
        </section>

        {/* iPhone & Widgets Integration Card */}
        <section className="calm-card p-6 sm:p-7 bg-gradient-to-br from-white to-[#F4EFE8]/70 dark:from-[#1A201C] dark:to-[#121613] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#EDF9FA] dark:bg-[#132426] text-[#D46743] dark:text-[#BFE7EA] flex items-center justify-center shrink-0">
              <i className="pi pi-mobile text-lg"></i>
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-[#2C332D] dark:text-white">
                Atajos & Widgets de iPhone y Android
              </h2>
              <p className="text-xs text-[#6B5547] dark:text-[#BFE7EA] max-w-md">
                Registrá gastos o ingresos rápidamente con el Botón de Acción, Siri o widgets en la pantalla de inicio sin abrir la app.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowIPhoneModal(true)}
            className="calm-btn-primary px-4 py-2 text-xs font-semibold shrink-0 cursor-pointer shadow-sm"
          >
            Configurar Atajo / Widget
          </button>
        </section>

        {/* Birth Date Form */}
        <section className="calm-card p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2 text-[#2C332D] dark:text-white">
            <div className="w-7 h-7 rounded-full bg-[#EDF9FA] dark:bg-[#132426] text-[#D46743] flex items-center justify-center text-xs">
              <i className="pi pi-calendar"></i>
            </div>
            <h2 className="text-sm font-bold">Fecha de nacimiento</h2>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <MaskedInput
              mask="99/99/9999"
              slotChar="/"
              value={birthDate}
              onChange={(v) => {
                setBirthDate(v);
                if (dateError) setDateError('');
              }}
              placeholder="DD/MM/AAAA"
              className="flex-1 calm-input"
            />
            <button
              onClick={handleSaveDate}
              disabled={savingDate}
              className="calm-btn-primary px-5 py-2.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-2 shadow-sm"
            >
              <i className={`pi ${savingDate ? 'pi-spin pi-spinner' : 'pi-check'} text-xs`}></i>
              <span>{savingDate ? 'Guardando…' : 'Guardar'}</span>
            </button>
          </div>
          {dateError && (
            <p className="text-xs text-[#D46743]">{dateError}</p>
          )}
          {profileBirthDate && !dateError && (
            <p className="text-xs text-[#D46743] dark:text-[#BFE7EA] flex items-center gap-1.5 font-medium">
              <i className="pi pi-check-circle text-xs"></i>
              <span>Fecha registrada: {profileBirthDate}</span>
            </p>
          )}
        </section>

        {/* Months History */}
        <section className="calm-card p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2 text-[#2C332D] dark:text-white">
            <div className="w-7 h-7 rounded-full bg-[#EDF9FA] dark:bg-[#132426] text-[#D46743] flex items-center justify-center text-xs">
              <i className="pi pi-clock"></i>
            </div>
            <h2 className="text-sm font-bold">Historial de Meses</h2>
          </div>

          {monthsLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between h-14 bg-[#FFEAD3]/40 dark:bg-[#1E1814] rounded-2xl animate-pulse px-4">
                  <div className="h-4 w-28 bg-[#F0D7BC] dark:bg-[#3A2E25] rounded-full" />
                  <div className="h-4 w-24 bg-[#F0D7BC] dark:bg-[#3A2E25] rounded-full" />
                </div>
              ))}
            </div>
          ) : months.length === 0 ? (
            <p className="text-xs text-[#9E8575] py-3">No hay meses guardados todavía.</p>
          ) : (
            <div className="divide-y divide-[#F0D7BC]/70 dark:divide-[#3A2E25]">
              {months.map((m) => {
                const [year, monthNum] = m.id.split('-');
                const monthName = MONTH_NAMES[parseInt(monthNum, 10) - 1] || m.id;
                const totalIncome = m.budget.cash?.totalIncome ?? 0;
                const totalExpenses = [...m.budget.needs, ...m.budget.wants, ...m.budget.savings]
                  .reduce((sum, e) => sum + e.amount, 0);

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between py-3.5 px-2 hover:bg-[#FFEAD3]/40 dark:hover:bg-[#261F1A]/50 rounded-2xl transition-colors"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-[#2C332D] dark:text-white">
                        {monthName} {year}
                      </span>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-[#D46743] dark:text-[#BFE7EA] flex items-center gap-1 font-mono font-medium">
                          <i className="pi pi-arrow-up text-[9px]"></i>
                          {formatCurrency(totalIncome)}
                        </span>
                        <span className="text-xs text-[#9E8575] flex items-center gap-1 font-mono font-medium">
                          <i className="pi pi-arrow-down text-[9px]"></i>
                          {formatCurrency(totalExpenses)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold font-mono tabular-nums ${
                        m.balance > 0
                          ? 'text-[#D46743] dark:text-[#BFE7EA]'
                          : m.balance < 0
                          ? 'text-[#D46743]'
                          : 'text-[#9E8575]'
                      }`}
                    >
                      {m.balance >= 0 ? '+' : ''}{formatCurrency(m.balance)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* iPhone Modal */}
      <IPhoneIntegrationModal
        isOpen={showIPhoneModal}
        onClose={() => setShowIPhoneModal(false)}
      />
    </div>
  );
}
