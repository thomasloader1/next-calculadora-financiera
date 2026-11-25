'use client';

import React from 'react';

interface MobileBottomNavProps {
  onAddExpense: () => void;
  onAddIncome: () => void;
  onOpenTransfers: () => void;
  onOpenWidgetModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onAddExpense,
  onAddIncome,
  onOpenTransfers,
  onOpenWidgetModal,
}) => {
  return (
    <nav
      aria-label="Navegación móvil"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-paper border-t border-rule pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 items-center px-2 py-1.5">
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center justify-center gap-1 min-h-[52px] text-ink-2 hover:text-ink transition-colors cursor-pointer">
          <i className="pi pi-home text-base" aria-hidden="true"></i>
          <span className="text-xs whitespace-nowrap">Inicio</span>
        </button>

        <button type="button" onClick={onAddIncome} className="flex flex-col items-center justify-center gap-1 min-h-[52px] text-ink-2 hover:text-ink transition-colors cursor-pointer">
          <i className="pi pi-arrow-down-left text-base" aria-hidden="true"></i>
          <span className="text-xs whitespace-nowrap">Ingreso</span>
        </button>

        <button type="button" onClick={onAddExpense} className="calm-btn-primary mx-1 min-h-[48px] px-2" aria-label="Nuevo gasto">
          <i className="pi pi-plus text-sm" aria-hidden="true"></i>
          <span className="whitespace-nowrap">Gasto</span>
        </button>

        <button type="button" onClick={onOpenTransfers} className="flex flex-col items-center justify-center gap-1 min-h-[52px] text-ink-2 hover:text-ink transition-colors cursor-pointer">
          <i className="pi pi-exchange-alt text-base" aria-hidden="true"></i>
          <span className="text-xs whitespace-nowrap">Transferir</span>
        </button>

        <button type="button" onClick={onOpenWidgetModal} className="flex flex-col items-center justify-center gap-1 min-h-[52px] text-ink-2 hover:text-ink transition-colors cursor-pointer">
          <i className="pi pi-th-large text-base" aria-hidden="true"></i>
          <span className="text-xs whitespace-nowrap">Widget</span>
        </button>
      </div>
    </nav>
  );
};
