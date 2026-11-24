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
      className="sm:hidden fixed bottom-3 left-3 right-3 z-40"
    >
      <div className="bg-[#FAF6F0]/95 dark:bg-[#1E1814]/95 backdrop-blur-lg border border-[#F0D7BC] dark:border-[#3A2E25] rounded-full px-3 py-2 shadow-xl flex items-center justify-around gap-1 max-w-md mx-auto">
        {/* Tab 1: Home */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex flex-col items-center justify-center py-1 px-3 text-[#6B5547] hover:text-[#2C211B] dark:hover:text-white transition-colors cursor-pointer"
        >
          <i className="pi pi-home text-base"></i>
          <span className="text-[10px] font-medium mt-0.5">Inicio</span>
        </button>

        {/* Tab 2: + Gasto (Central Hero Action) */}
        <button
          type="button"
          onClick={onAddExpense}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#D46743] hover:bg-[#BF5835] text-white rounded-full shadow-md shadow-[#D46743]/30 font-semibold text-xs active:scale-95 transition-all cursor-pointer"
        >
          <i className="pi pi-plus text-xs"></i>
          <span>Gasto</span>
        </button>

        {/* Tab 3: + Ingreso */}
        <button
          type="button"
          onClick={onAddIncome}
          className="flex flex-col items-center justify-center py-1 px-3 text-[#6B5547] hover:text-[#2C211B] dark:hover:text-white transition-colors cursor-pointer"
        >
          <i className="pi pi-arrow-down-left text-base text-[#D46743]"></i>
          <span className="text-[10px] font-medium mt-0.5">Ingreso</span>
        </button>

        {/* Tab 4: Transferir */}
        <button
          type="button"
          onClick={onOpenTransfers}
          className="flex flex-col items-center justify-center py-1 px-3 text-[#6B5547] hover:text-[#2C211B] dark:hover:text-white transition-colors cursor-pointer"
        >
          <i className="pi pi-exchange-alt text-base text-[#E89B5B]"></i>
          <span className="text-[10px] font-medium mt-0.5">Transferir</span>
        </button>

        {/* Tab 5: Widget */}
        <button
          type="button"
          onClick={onOpenWidgetModal}
          className="flex flex-col items-center justify-center py-1 px-2.5 text-[#6B5547] hover:text-[#2C211B] dark:hover:text-white transition-colors cursor-pointer"
        >
          <i className="pi pi-th-large text-base text-[#2A8187] dark:text-[#BFE7EA]"></i>
          <span className="text-[10px] font-medium mt-0.5">Widget</span>
        </button>
      </div>
    </nav>
  );
};
