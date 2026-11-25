'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '@/context/Auth/AuthContext';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import Link from 'next/link';
import MonthSelector from './MonthSelector';
import { nameToColor, getInitial } from '@/utils/avatar';
import { ThemeToggle } from './ThemeToggle';
import { importFromExcel } from '@/lib/excel';
import { toast } from 'sonner';
import { IPhoneIntegrationModal } from './IPhoneIntegrationModal';
import type { CategoryKey } from '@/interfaces/Transfer';
import type { Expense } from '@/interfaces/Expense';

const CATEGORY_MAP: Record<string, CategoryKey> = {
  'Necesidades': 'needs',
  'Imprevistos': 'wants',
  'Ahorro': 'savings',
};

const Navbar: React.FC = () => {
  const { user, loading, cloudAvailable, loginWithGoogle, logout } = useAuthContext();
  const { isLoading, addExpenseToCategory } = useExpenseContext();
  const [showProfile, setShowProfile] = useState(false);
  const [showIPhoneModal, setShowIPhoneModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    }
    if (showProfile) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showProfile]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importFromExcel(file);
      let count = 0;
      for (const [sheetName, categoryKey] of Object.entries(CATEGORY_MAP)) {
        const items = result[categoryKey === 'needs' ? 'needs' : categoryKey === 'wants' ? 'wants' : 'savings'] || [];
        for (const item of items) {
          const expense: Expense = {
            id: (Math.random() + Date.now()).toString() + `_${count}`,
            description: item.description || 'Importado',
            amount: item.amount,
            ...(item.currency === 'USD' ? { currency: 'USD' as const } : {}),
          };
          addExpenseToCategory(categoryKey, expense);
          count++;
        }
      }
      toast.success(`${count} gastos importados correctamente`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`No se pudo importar: ${message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-paper border-b border-rule">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="Finanzas 50/30/20, inicio">
          <div className="w-8 h-8 bg-accent rounded-input flex items-center justify-center">
            <i className="pi pi-chart-pie text-accent-ink text-sm" aria-hidden="true"></i>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-base text-ink tracking-tight leading-none whitespace-nowrap">
              Finanzas 50/30/20
            </span>
            <span className="text-xs text-muted hidden md:inline mt-1">
              Presupuesto personal sereno
            </span>
          </div>
        </Link>

        {/* Center — Month Selector */}
        {user && (
          <div className="hidden md:block absolute left-1/2 -translate-x-1/2">
            <MonthSelector isLoading={isLoading} />
          </div>
        )}

        {/* Right side — Actions */}
        <div className="flex items-center gap-1">
          {/* Quick Import Excel button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-input flex items-center justify-center text-muted hover:text-ink hover:bg-paper-3 transition-colors cursor-pointer"
            title="Importar Excel"
            aria-label="Importar Excel"
          >
            <i className="pi pi-upload text-sm" aria-hidden="true"></i>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImport}
            className="hidden"
          />

          {/* iPhone Shortcut button */}
          <button
            onClick={() => setShowIPhoneModal(true)}
            className="w-10 h-10 rounded-input flex items-center justify-center text-muted hover:text-ink hover:bg-paper-3 transition-colors cursor-pointer"
            title="Integración con iPhone & Widgets"
            aria-label="Integración con iPhone & Widgets"
          >
            <i className="pi pi-mobile text-sm" aria-hidden="true"></i>
          </button>

          {/* Theme toggle */}
          <ThemeToggle />

          <div className="w-px h-6 bg-rule mx-1 hidden sm:block"></div>

          {user && !user.isAnonymous ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 p-1 md:pl-3 rounded-input hover:bg-paper-3 transition-colors cursor-pointer"
              >
                <span className="text-sm font-medium text-ink hidden md:inline">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || user.email || ''}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-accent-ink text-xs font-bold ${nameToColor(user.displayName || user.email || '')}`}
                  >
                    {getInitial(user.displayName || user.email)}
                  </div>
                )}
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-2 w-64 bg-surface border border-rule rounded-card shadow-lift py-1.5 z-50">
                  <div className="px-3.5 py-2 border-b border-rule">
                    <p className="text-sm font-medium text-ink truncate">
                      {user.displayName || 'Usuario'}
                    </p>
                    <p className="text-sm text-muted truncate">
                      {user.email}
                    </p>
                    <p className="mt-1 text-xs text-accent inline-flex items-center gap-1.5">
                      <i className="pi pi-cloud text-xs" aria-hidden="true"></i>
                      <span>Sincronizado con Google</span>
                    </p>
                  </div>
                  <div className="p-1">
                    <Link
                      href="/profile"
                      onClick={() => setShowProfile(false)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-ink hover:bg-paper-2 rounded-input transition-colors"
                    >
                      <i className="pi pi-user text-xs text-muted" aria-hidden="true"></i>
                      <span>Mi perfil</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => { setShowIPhoneModal(true); setShowProfile(false); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-ink hover:bg-paper-2 rounded-input transition-colors text-left cursor-pointer"
                    >
                      <i className="pi pi-mobile text-xs text-muted"></i>
                      <span>Atajos & Widgets</span>
                    </button>
                    <button
                      onClick={() => { logout(); setShowProfile(false); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-error hover:bg-error-soft rounded-input transition-colors cursor-pointer"
                    >
                      <i className="pi pi-sign-out text-xs"></i>
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : !cloudAvailable ? (
            <span
              className="text-sm text-muted inline-flex items-center gap-1.5 px-2"
              title="Tus datos se guardan solo en este dispositivo"
            >
              <i className="pi pi-database text-xs" aria-hidden="true"></i>
              <span>Local</span>
            </span>
          ) : (
            <button
              onClick={loginWithGoogle}
              disabled={loading}
              className="calm-btn-secondary ml-1"
              aria-label="Iniciar sesión con Google"
            >
              {loading ? (
                <i className="pi pi-spin pi-spinner text-xs"></i>
              ) : (
                <i className="pi pi-google text-xs"></i>
              )}
              <span className="hidden sm:inline">Iniciar sesión</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile MonthSelector bar: clean, slim, calm */}
      {user && (
        <div className="md:hidden border-t border-rule px-4 py-2 flex justify-center bg-paper">
          <MonthSelector isLoading={isLoading} />
        </div>
      )}

      {/* iPhone & Android Integration Modal */}
      <IPhoneIntegrationModal
        isOpen={showIPhoneModal}
        onClose={() => setShowIPhoneModal(false)}
      />
    </nav>
  );
};

export default Navbar;
