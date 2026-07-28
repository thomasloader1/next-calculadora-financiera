'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { exportToExcel, importFromExcel } from '@/lib/excel';
import type { CategoryKey } from '@/interfaces/Transfer';
import type { Expense } from '@/interfaces/Expense';
import { toast } from 'sonner';

const REVERSE_CATEGORY_MAP: Record<string, string> = {
  needs: 'Necesidad',
  wants: 'Imprevistos',
  savings: 'Ahorro',
};

export const ExcelButtons: React.FC<{ showExport?: boolean }> = ({ showExport = false }) => {
  const {
    needs, wants, savings, cash,
    incomes, transfers, globalSplit,
    currentMonth, addExpenseToCategory,
  } = useExpenseContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    if (!cash) {
      toast.error('No hay datos para exportar');
      return;
    }

    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);

    try {
      await exportToExcel(
        {
          month: currentMonth,
          totalIncome,
          globalSplit,
          cash: { needs: cash.needs, wants: cash.wants, savings: cash.savings },
          needs,
          wants,
          savings,
          transfers,
        },
        `calculadora-${currentMonth}`,
      );
      toast.success('Archivo exportado correctamente');
    } catch {
      toast.error('No se pudo exportar el archivo');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importFromExcel(file);

      // Populate each category from imported data
      const categoryMap: Record<string, CategoryKey> = {
        'Necesidades': 'needs',
        'Imprevistos': 'wants',
        'Ahorro': 'savings',
      };

      const sheetCategoryMap: Record<string, typeof result.needs> = {
        'Necesidades': result.needs,
        'Imprevistos': result.wants,
        'Ahorro': result.savings,
      };

      let count = 0;
      for (const [sheetName, categoryKey] of Object.entries(categoryMap)) {
        const items = sheetCategoryMap[sheetName] || [];
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
      // Reset file input so the same file can be re-imported
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {showExport && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleExport}
          isDisabled={!cash}
          className="text-cds-muted hover:text-cds-foreground"
          startContent={<i className="pi pi-file-excel text-sm"></i>}
        >
          Exportar
        </Button>
      )}

      <Button
        size="sm"
        variant="ghost"
        onClick={() => fileInputRef.current?.click()}
        className="text-cds-muted hover:text-cds-foreground"
        startContent={<i className="pi pi-upload text-sm"></i>}
      >
        Importar
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
};
