'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '@/context/Auth/AuthContext';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import MonthSelector from './MonthSelector';
import { nameToColor, getInitial } from '@/utils/avatar';
import { ThemeToggle } from './ThemeToggle';
import { importFromExcel } from '@/lib/excel';
import { toast } from 'sonner';
import type { CategoryKey } from '@/interfaces/Transfer';
import type { Expense } from '@/interfaces/Expense';

const CATEGORY_MAP: Record<string, CategoryKey> = {
  'Necesidades': 'needs',
  'Imprevistos': 'wants',
  'Ahorro': 'savings',
};

const Navbar: React.FC = () => {
  const { user, loading, loginWithGoogle, logout } = useAuthContext();
  const { isLoading } = useExpenseContext();
  const [showProfile, setShowProfile] = useState(false);
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
      const ctx = (window as any).__expenseContext;
      if (ctx) {
        for (const [sheetName, categoryKey] of Object.entries(CATEGORY_MAP)) {
          const items = result[categoryKey === 'needs' ? 'needs' : categoryKey === 'wants' ? 'wants' : 'savings'] || [];
          for (const item of items) {
            const expense: Expense = {
              id: (Math.random() + Date.now()).toString() + `_${count}`,
              description: item.description || 'Importado',
              amount: item.amount,
              ...(item.currency === 'USD' ? { currency: 'USD' as const } : {}),
            };
            ctx.addExpenseToCategory(categoryKey, expense);
            count++;
          }
        }
        toast.success(`${count} gastos importados correctamente`);
      } else {
        toast.error('Contexto no disponible');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`No se pudo importar: ${message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-cds-surface border-b border-cds-border">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-cds-primary rounded-cds-sm flex items-center justify-center">
            <span className="text-white text-xs font-bold">50</span>
          </div>
          <span className="text-sm font-semibold text-cds-foreground tracking-tight">
            Calculadora
          </span>
        </div>

        {/* Center — Month Selector */}
        {user && (
          <div className="absolute left-1/2 -translate-x-1/2">
            <MonthSelector isLoading={isLoading} />
          </div>
        )}

        {/* Right side — grouped actions */}
        <div className="flex items-center gap-1">
          {/* Import button */}
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            onClick={() => fileInputRef.current?.click()}
            className="h-8 w-8 text-cds-muted dark:text-white hover:text-cds-foreground dark:hover:bg-cds-surface-dark"
            aria-label="Importar Excel"
            startContent={<i className="pi pi-upload text-sm"></i>}
          > Importar
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
          />

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Divider */}
          <div className="w-px h-5 bg-cds-border mx-1"></div>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-cds-sm hover:bg-cds-surface-dark transition-colors cursor-pointer"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || user.email || ''}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${nameToColor(user.displayName || user.email || '')}`}
                    aria-label={user.displayName || user.email || 'User avatar'}
                  >
                    {getInitial(user.displayName || user.email)}
                  </div>
                )}
                <span className="text-xs text-cds-muted hidden sm:block">{user.displayName}</span>
              </button>

              {showProfile && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-cds-surface border border-cds-border rounded-cds-lg shadow-lg py-3 px-4 space-y-3 animate-fade-down">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || user.email || ''}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${nameToColor(user.displayName || user.email || '')}`}
                      >
                        {getInitial(user.displayName || user.email)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-cds-foreground truncate">
                        {user.displayName || 'Sin nombre'}
                      </p>
                      <p className="text-xs text-cds-muted truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-cds-border pt-2 space-y-1">
                    <Link
                      href="/profile"
                      onClick={() => setShowProfile(false)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-cds-foreground hover:bg-cds-surface-dark rounded-cds-sm transition-colors"
                    >
                      <i className="pi pi-user"></i>
                      Mi perfil
                    </Link>
                    <button
                      onClick={() => { logout(); setShowProfile(false); }}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-cds-negative hover:bg-cds-surface-dark rounded-cds-sm transition-colors"
                    >
                      <i className="pi pi-sign-out"></i>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button
              size="sm"
              onClick={loginWithGoogle}
              isLoading={loading}
              className="h-8"
              startContent={!loading && <i className="pi pi-google text-sm"></i>}
            >
              Iniciar sesión
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
