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
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <i className="pi pi-spin pi-spinner text-2xl text-accent" aria-hidden="true"></i>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col pb-12">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-paper border-b border-rule">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="calm-btn-secondary"
          >
            <i className="pi pi-arrow-left text-xs" aria-hidden="true"></i>
            <span>Volver a la calculadora</span>
          </button>
          <span className="text-sm text-muted">Mi perfil</span>
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
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-accent-ink text-xl font-bold ${nameToColor(user.displayName || user.email || '')}`}
              >
                {getInitial(user.displayName || user.email)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl text-ink truncate">
                {user.displayName || 'Usuario'}
              </h1>
              <p className="text-sm text-muted truncate">{user.email}</p>
            </div>
          </div>
        </section>

        {/* iPhone & Widgets Integration Card */}
        <section className="plastic plastic--savings p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <i className="pi pi-mobile text-lg text-ink mt-0.5" aria-hidden="true"></i>
            <div className="space-y-1">
              <h2 className="text-base text-ink">
                Atajos & Widgets de iPhone y Android
              </h2>
              <p className="text-sm text-ink-2 max-w-md">
                Registrá gastos o ingresos rápidamente con el Botón de Acción, Siri o widgets en la pantalla de inicio sin abrir la app.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowIPhoneModal(true)}
            className="calm-btn-secondary shrink-0"
          >
            Configurar Atajo / Widget
          </button>
        </section>

        {/* Birth Date Form */}
        <section className="calm-card p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2 text-ink">
            <h2 className="text-base">Fecha de nacimiento</h2>
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
              type="button"
              onClick={handleSaveDate}
              disabled={savingDate}
              className="calm-btn-primary min-h-[44px]"
            >
              <i className={`pi ${savingDate ? 'pi-spin pi-spinner' : 'pi-check'} text-xs`} aria-hidden="true"></i>
              <span>{savingDate ? 'Guardando…' : 'Guardar'}</span>
            </button>
          </div>
          {dateError && (
            <p className="text-sm text-error" role="alert">{dateError}</p>
          )}
          {profileBirthDate && !dateError && (
            <p className="text-sm text-accent flex items-center gap-1.5">
              <i className="pi pi-check-circle text-xs" aria-hidden="true"></i>
              <span>Fecha registrada: {profileBirthDate}</span>
            </p>
          )}
        </section>

        {/* Months History */}
        <section className="calm-card p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2 text-ink">
            <h2 className="text-base">Historial de meses</h2>
          </div>

          {monthsLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between h-12 bg-paper-2 rounded-input animate-pulse px-4">
                  <div className="h-4 w-28 bg-rule rounded-full" />
                  <div className="h-4 w-24 bg-rule rounded-full" />
                </div>
              ))}
            </div>
          ) : months.length === 0 ? (
            <p className="text-sm text-muted py-3">No hay meses guardados todavía.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule text-left text-muted">
                  <th scope="col" className="py-2 pr-3 font-medium whitespace-nowrap">Mes</th>
                  <th scope="col" className="py-2 px-3 font-medium text-right whitespace-nowrap">Ingresos</th>
                  <th scope="col" className="py-2 px-3 font-medium text-right whitespace-nowrap hidden sm:table-cell">Gastos</th>
                  <th scope="col" className="py-2 pl-3 font-medium text-right whitespace-nowrap">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {months.map((m) => {
                  const [year, monthNum] = m.id.split('-');
                  const monthName = MONTH_NAMES[parseInt(monthNum, 10) - 1] || m.id;
                  const totalIncome = m.budget.cash?.totalIncome ?? 0;
                  const totalExpenses = [...m.budget.needs, ...m.budget.wants, ...m.budget.savings]
                    .reduce((sum, e) => sum + e.amount, 0);

                  return (
                    <tr key={m.id}>
                      <th scope="row" className="py-3 pr-3 text-left font-medium text-ink whitespace-nowrap">
                        {monthName} {year}
                      </th>
                      <td className="py-3 px-3 text-right tabular-nums text-ink-2">{formatCurrency(totalIncome)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-ink-2 hidden sm:table-cell">{formatCurrency(totalExpenses)}</td>
                      <td
                        className={`py-3 pl-3 text-right font-medium tabular-nums ${
                          m.balance > 0 ? 'text-accent' : m.balance < 0 ? 'text-error' : 'text-muted'
                        }`}
                      >
                        {m.balance >= 0 ? '+' : ''}{formatCurrency(m.balance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
