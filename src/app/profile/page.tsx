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
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  // Load profile and months
  const loadData = useCallback(async () => {
    if (!user) return;
    setProfileLoaded(true);

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
      <div className="min-h-screen flex flex-col">
      <div className="h-14 bg-cds-surface border-b border-cds-border flex items-center px-4">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-sm text-cds-muted hover:text-cds-foreground transition-colors"
        >
          <i className="pi pi-arrow-left text-xs"></i>
          Volver al inicio
        </button>
      </div>
        <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 w-full">
          <div className="border border-cds-border bg-cds-surface rounded-cds-lg p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-cds-surface-dark animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-cds-surface-dark rounded animate-pulse" />
                <div className="h-3 w-48 bg-cds-surface-dark rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="border border-cds-border bg-cds-surface rounded-cds-lg p-6 space-y-3">
            <div className="h-4 w-36 bg-cds-surface-dark rounded animate-pulse" />
            <div className="h-10 w-full bg-cds-surface-dark rounded animate-pulse" />
          </div>
          <div className="border border-cds-border bg-cds-surface rounded-cds-lg p-6 space-y-3">
            <div className="h-4 w-36 bg-cds-surface-dark rounded animate-pulse" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 w-full bg-cds-surface-dark rounded animate-pulse" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-14 bg-cds-surface border-b border-cds-border flex items-center px-4">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-1.5 text-sm text-cds-muted hover:text-cds-foreground transition-colors"
        >
          <i className="pi pi-arrow-left text-xs"></i>
          Volver al inicio
        </button>
      </div>
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 w-full">
        <section className="border border-cds-border bg-cds-surface rounded-cds-lg p-6">
          <div className="flex items-center gap-4">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || user.email || ''}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold ${nameToColor(user.displayName || user.email || '')}`}
              >
                {getInitial(user.displayName || user.email)}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-lg font-semibold text-cds-foreground truncate">
                {user.displayName || 'Sin nombre'}
              </p>
              <p className="text-sm text-cds-muted truncate">{user.email}</p>
            </div>
          </div>
        </section>

        {/* Birth Date Form Section */}
        <section className="border border-cds-border bg-cds-surface rounded-cds-lg p-6 space-y-3">
          <div className="flex items-center gap-2">
            <i className="pi pi-calendar text-cds-muted text-sm"></i>
            <h2 className="text-sm font-semibold text-cds-foreground">Fecha de nacimiento</h2>
          </div>
          <div className="flex items-center gap-3">
            <MaskedInput
              mask="99/99/9999"
              slotChar="/"
              value={birthDate}
              onChange={(v) => {
                setBirthDate(v);
                if (dateError) setDateError('');
              }}
              placeholder="DD/MM/AAAA"
              className="flex-1"
            />
            <button
              onClick={handleSaveDate}
              disabled={savingDate}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-cds-primary text-white text-sm font-semibold rounded-cds-pill hover:bg-cds-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className={`pi ${savingDate ? 'pi-spin pi-spinner' : 'pi-check'} text-xs`}></i>
              {savingDate ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
          {dateError && (
            <p className="text-xs text-cds-negative">{dateError}</p>
          )}
          {profileBirthDate && !dateError && (
            <p className="text-xs text-cds-muted">
              <i className="pi pi-check-circle text-cds-positive mr-1 text-[10px]"></i>
              Guardado: {profileBirthDate}
            </p>
          )}
        </section>

        {/* Month History Section */}
        <section className="border border-cds-border bg-cds-surface rounded-cds-lg p-6 space-y-3">
          <div className="flex items-center gap-2">
            <i className="pi pi-clock text-cds-muted text-sm"></i>
            <h2 className="text-sm font-semibold text-cds-foreground">Historial de meses</h2>
          </div>

          {monthsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between h-12 bg-cds-surface rounded animate-pulse px-4">
                  <div className="h-4 w-24 bg-cds-border rounded" />
                  <div className="h-4 w-20 bg-cds-border rounded" />
                </div>
              ))}
            </div>
          ) : months.length === 0 ? (
            <p className="text-sm text-cds-muted">No hay meses guardados</p>
          ) : (
            <div className="space-y-2">
              {months.map((m) => {
                const [year, monthNum] = m.id.split('-');
                const monthName = MONTH_NAMES[parseInt(monthNum, 10) - 1] || m.id;
                const totalIncome = m.budget.cash?.totalIncome ?? 0;
                const totalExpenses = [...m.budget.needs, ...m.budget.wants, ...m.budget.savings]
                  .reduce((sum, e) => sum + e.amount, 0);

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-4 py-3 rounded-cds-sm hover:bg-cds-surface transition-colors"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-cds-foreground">
                        {monthName} {year}
                      </span>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-cds-positive flex items-center gap-1">
                          <i className="pi pi-arrow-up text-[9px]"></i>
                          {formatCurrency(totalIncome)}
                        </span>
                        <span className="text-xs text-cds-negative flex items-center gap-1">
                          <i className="pi pi-arrow-down text-[9px]"></i>
                          {formatCurrency(totalExpenses)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        m.balance > 0
                          ? 'text-cds-positive'
                          : m.balance < 0
                          ? 'text-cds-negative'
                          : 'text-cds-muted'
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
    </div>
  );
}
