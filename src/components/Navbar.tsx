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
    <nav className="sticky top-0 z-40 bg-[#FAF6F0]/90 dark:bg-[#1E1814]/90 backdrop-blur-md border-b border-[#F0D7BC] dark:border-[#3A2E25] transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#D46743] rounded-xl flex items-center justify-center shadow-xs">
            <i className="pi pi-chart-pie text-white text-xs"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#2C211B] dark:text-white tracking-tight leading-none">
              Finanzas 50/30/20
            </span>
            <span className="text-[10px] text-[#6B5547] dark:text-[#C4B1A3] font-medium hidden sm:inline">
              Presupuesto personal sereno
            </span>
          </div>
        </Link>

        {/* Center — Month Selector */}
        {user && (
          <div className="hidden sm:block absolute left-1/2 -translate-x-1/2">
            <MonthSelector isLoading={isLoading} />
          </div>
        )}

        {/* Right side — Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Import Excel button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B5547] hover:text-[#2C211B] dark:text-[#C4B1A3] dark:hover:text-white hover:bg-[#FFEAD3] dark:hover:bg-[#2E2218] transition-colors cursor-pointer"
            title="Importar Excel"
            aria-label="Importar Excel"
          >
            <i className="pi pi-upload text-xs"></i>
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
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B5547] hover:text-[#2C211B] dark:text-[#C4B1A3] dark:hover:text-white hover:bg-[#FFEAD3] dark:hover:bg-[#2E2218] transition-colors cursor-pointer"
            title="Integración con iPhone & Widgets"
            aria-label="Integración con iPhone & Widgets"
          >
            <i className="pi pi-mobile text-xs"></i>
          </button>

          {/* Theme toggle */}
          <ThemeToggle />

          <div className="w-px h-5 bg-[#E8E2D8] dark:border-[#2A362D] mx-1"></div>

          {user && !user.isAnonymous ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 p-1 pl-2 rounded-full hover:bg-[#F4EFE8] dark:hover:bg-[#2A362D] transition-colors cursor-pointer border border-[#E8E2D8] dark:border-[#2A362D]"
              >
                <span className="text-xs font-medium text-[#232B25] dark:text-[#F3F6F3] hidden md:inline">
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
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${nameToColor(user.displayName || user.email || '')}`}
                  >
                    {getInitial(user.displayName || user.email)}
                  </div>
                )}
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1E2720] border border-[#E8E2D8] dark:border-[#2A362D] rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-2 border-b border-[#E8E2D8] dark:border-[#2A362D]">
                    <p className="text-xs font-semibold text-[#232B25] dark:text-white truncate">
                      {user.displayName || 'Usuario'}
                    </p>
                    <p className="text-[11px] text-[#5F6F63] dark:text-[#A3B4A5] truncate">
                      {user.email}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold text-[#2A8187] inline-flex items-center gap-1">
                      <i className="pi pi-cloud text-[10px]"></i>
                      <span>Sincronizado con Google</span>
                    </p>
                  </div>
                  <div className="p-1">
                    <Link
                      href="/profile"
                      onClick={() => setShowProfile(false)}
                      className="flex items-center gap-2.5 w-full px-3 py-1.5 text-xs text-[#232B25] dark:text-white hover:bg-[#F4EFE8] dark:hover:bg-[#2A362D] rounded-xl transition-colors"
                    >
                      <i className="pi pi-user text-xs text-[#5F6F63]"></i>
                      <span>Mi perfil</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => { setShowIPhoneModal(true); setShowProfile(false); }}
                      className="flex items-center gap-2.5 w-full px-3 py-1.5 text-xs text-[#232B25] dark:text-white hover:bg-[#F4EFE8] dark:hover:bg-[#2A362D] rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <i className="pi pi-mobile text-xs text-[#5F6F63]"></i>
                      <span>Atajos & Widgets</span>
                    </button>
                    <button
                      onClick={() => { logout(); setShowProfile(false); }}
                      className="flex items-center gap-2.5 w-full px-3 py-1.5 text-xs text-[#B44C4C] hover:bg-[#B44C4C]/10 rounded-xl transition-colors cursor-pointer"
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
              className="text-[11px] font-semibold text-[#9E8575] inline-flex items-center gap-1 px-2"
              title="Tus datos se guardan solo en este dispositivo"
            >
              <i className="pi pi-database text-[10px]"></i>
              <span>Local</span>
            </span>
          ) : (
            <button
              onClick={loginWithGoogle}
              disabled={loading}
              className="calm-btn-primary py-2 px-4 text-xs font-medium"
            >
              {loading ? (
                <i className="pi pi-spin pi-spinner text-xs"></i>
              ) : (
                <i className="pi pi-google text-xs"></i>
              )}
              <span>Iniciar sesión</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile MonthSelector bar: clean, slim, calm */}
      {user && (
        <div className="sm:hidden border-t border-[#E8E2D8] dark:border-[#2A362D] px-4 py-2 flex justify-center bg-[#FAF8F5]/80 dark:bg-[#19201B]/80">
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
