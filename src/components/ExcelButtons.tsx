'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import {
  exportToExcel,
  exportToCSV,
  copyForSpreadsheet,
  importFromExcel,
  downloadExcelTemplate,
  downloadCSVTemplate,
  exportAllToExcel,
  downloadBackupJSON,
  parseBackup,
} from '@/lib/excel';
import { useAuthContext } from '@/context/Auth/AuthContext';
import { getAllMonths, restoreMonths } from '@/Services/firebase';
import type { CategoryKey } from '@/interfaces/Transfer';
import type { Expense } from '@/interfaces/Expense';
import { toast } from 'sonner';

export const ExcelButtons: React.FC<{ showExport?: boolean }> = ({ showExport = false }) => {
  const {
    needs, wants, savings, cash,
    incomes, transfers, globalSplit,
    currentMonth, addExpenseToCategory, loadMonth,
  } = useExpenseContext();
  const { user } = useAuthContext();
  const backupInputRef = useRef<HTMLInputElement>(null);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const importDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
      if (importDropdownRef.current && !importDropdownRef.current.contains(e.target as Node)) {
        setIsImportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getExportData = () => {
    if (!cash) return null;
    const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    return {
      month: currentMonth,
      totalIncome,
      globalSplit,
      cash: { needs: cash.needs, wants: cash.wants, savings: cash.savings },
      needs,
      wants,
      savings,
      transfers,
    };
  };

  const handleExportExcel = async () => {
    setIsExportOpen(false);
    const data = getExportData();
    if (!data) {
      toast.error('No hay datos para exportar');
      return;
    }
    try {
      await exportToExcel(data, `calculadora-${currentMonth}`);
      toast.success('Archivo Excel (.xlsx) exportado correctamente');
    } catch {
      toast.error('No se pudo exportar a Excel');
    }
  };

  const handleExportCSV = () => {
    setIsExportOpen(false);
    const data = getExportData();
    if (!data) {
      toast.error('No hay datos para exportar');
      return;
    }
    try {
      exportToCSV(data, `calculadora-${currentMonth}`);
      toast.success('Archivo CSV (Spreadsheet) exportado correctamente');
    } catch {
      toast.error('No se pudo exportar a CSV');
    }
  };

  const handleCopySpreadsheet = async () => {
    setIsExportOpen(false);
    const data = getExportData();
    if (!data) {
      toast.error('No hay datos para exportar');
      return;
    }
    try {
      await copyForSpreadsheet(data);
      toast.success('¡Copiado! Abre Google Sheets y pega con Ctrl+V (o Cmd+V)');
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
  };

  const handleExportAllExcel = async () => {
    setIsExportOpen(false);
    if (!user) return;
    try {
      const months = await getAllMonths(user.uid);
      await exportAllToExcel(months, 'calculadora-todos-los-meses');
      toast.success(`Exportados ${Object.keys(months).length} mes(es) a Excel`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo exportar');
    }
  };

  const handleExportBackup = async () => {
    setIsExportOpen(false);
    if (!user) return;
    try {
      const months = await getAllMonths(user.uid);
      if (Object.keys(months).length === 0) {
        toast.error('No hay meses guardados para respaldar');
        return;
      }
      const date = new Date().toISOString().slice(0, 10);
      downloadBackupJSON(months, `calculadora-backup-${date}`);
      toast.success('Backup descargado. Guardalo en un lugar seguro.');
    } catch {
      toast.error('No se pudo generar el backup');
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const backup = parseBackup(await file.text());
      const { restored, skipped } = await restoreMonths(user.uid, backup.months);
      if (restored.includes(currentMonth)) await loadMonth(currentMonth);
      const skippedMsg = skipped.length > 0 ? ` (${skipped.length} ya existían y no se modificaron)` : '';
      toast.success(`${restored.length} mes(es) restaurados${skippedMsg}`);
      setIsImportOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo restaurar el backup');
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = '';
    }
  };

  const handleOpenGoogleSheets = () => {
    setIsExportOpen(false);
    window.open('https://sheets.new', '_blank');
  };

  const handleDownloadExcelTemplate = async () => {
    setIsImportOpen(false);
    setShowTemplateModal(false);
    try {
      await downloadExcelTemplate();
      toast.success('Plantilla Excel (.xlsx) descargada correctamente');
    } catch {
      toast.error('No se pudo generar la plantilla Excel');
    }
  };

  const handleDownloadCSVTemplate = () => {
    setIsImportOpen(false);
    setShowTemplateModal(false);
    try {
      downloadCSVTemplate();
      toast.success('Plantilla CSV descargada correctamente');
    } catch {
      toast.error('No se pudo generar la plantilla CSV');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importFromExcel(file);

      const categoryGroups: { key: CategoryKey; items: typeof result.needs }[] = [
        { key: 'needs', items: result.needs },
        { key: 'wants', items: result.wants },
        { key: 'savings', items: result.savings },
      ];

      let count = 0;
      for (const group of categoryGroups) {
        for (const item of group.items) {
          const expense: Expense = {
            id: (Math.random() + Date.now()).toString() + `_${count}`,
            description: item.description || 'Importado',
            amount: item.amount,
            ...(item.currency === 'USD' ? { currency: 'USD' as const } : {}),
          };
          addExpenseToCategory(group.key, expense);
          count++;
        }
      }

      toast.success(`${count} gastos importados correctamente en Necesidades, Imprevistos y Ahorro`);
      setIsImportOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`No se pudo importar: ${message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-1.5 relative">
      {/* ── Export Dropdown ── */}
      {showExport && (
        <div className="relative" ref={exportDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setIsExportOpen(!isExportOpen);
              setIsImportOpen(false);
            }}
            disabled={!cash}
            className="calm-btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <i className="pi pi-download text-xs text-accent"></i>
            <span>Exportar</span>
            <i className={`pi pi-chevron-down text-xs text-muted transition-transform ${isExportOpen ? 'rotate-180' : ''}`}></i>
          </button>

          {isExportOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-surface border border-rule rounded-card shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-1.5 text-xs font-bold text-muted border-b border-rule/60 mb-1">
                Opciones de exportación
              </div>
              <button
                type="button"
                onClick={handleExportExcel}
                className="w-full text-left px-3.5 py-2 text-xs text-ink hover:bg-paper-3 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-input bg-paper-3 text-ink-2 flex items-center justify-center shrink-0">
                  <i className="pi pi-file-excel text-xs"></i>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">Excel (.xlsx)</span>
                  <span className="text-xs text-muted">Libro con fórmulas y categorías</span>
                </div>
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full text-left px-3.5 py-2 text-xs text-ink hover:bg-paper-3 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-input bg-paper-2 text-accent flex items-center justify-center shrink-0">
                  <i className="pi pi-file text-xs"></i>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">Spreadsheet / CSV (.csv)</span>
                  <span className="text-xs text-muted">Para Google Sheets y Numbers</span>
                </div>
              </button>
              <button
                type="button"
                onClick={handleCopySpreadsheet}
                className="w-full text-left px-3.5 py-2 text-xs text-ink hover:bg-paper-3 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-input bg-paper-3 text-accent flex items-center justify-center shrink-0">
                  <i className="pi pi-copy text-xs"></i>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">Copiar para Google Sheets</span>
                  <span className="text-xs text-muted">Listo para pegar directo (Ctrl+V)</span>
                </div>
              </button>
              <div className="border-t border-rule/60 my-1.5"></div>
              <div className="px-3.5 py-1 text-xs font-bold text-muted">
                Todos los meses
              </div>
              <button
                type="button"
                onClick={handleExportAllExcel}
                className="w-full text-left px-3.5 py-2 text-xs text-ink hover:bg-paper-3 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-input bg-paper-3 text-ink-2 flex items-center justify-center shrink-0">
                  <i className="pi pi-table text-xs"></i>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">Exportar todo (.xlsx)</span>
                  <span className="text-xs text-muted">Una hoja por mes + resumen</span>
                </div>
              </button>
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full text-left px-3.5 py-2 text-xs text-ink hover:bg-paper-3 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-input bg-paper-2 text-accent flex items-center justify-center shrink-0">
                  <i className="pi pi-database text-xs"></i>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">Backup completo (.json)</span>
                  <span className="text-xs text-muted">Para restaurar en otro dispositivo</span>
                </div>
              </button>
              <div className="border-t border-rule/60 my-1.5"></div>
              <button
                type="button"
                onClick={handleOpenGoogleSheets}
                className="w-full text-left px-3.5 py-1.5 text-xs text-muted hover:text-ink hover:bg-paper-3 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <i className="pi pi-external-link text-xs"></i>
                <span>Crear Sheet nuevo (sheets.new)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Import Dropdown ── */}
      <div className="relative" ref={importDropdownRef}>
        <button
          type="button"
          onClick={() => {
            setIsImportOpen(!isImportOpen);
            setIsExportOpen(false);
          }}
          className="calm-btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer"
        >
          <i className="pi pi-upload text-xs text-muted"></i>
          <span>Importar</span>
          <i className={`pi pi-chevron-down text-xs text-muted transition-transform ${isImportOpen ? 'rotate-180' : ''}`}></i>
        </button>

        {isImportOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-surface border border-rule rounded-card shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
            {/* Header: Plantillas */}
            <div className="px-3.5 py-1.5 text-xs font-bold text-accent border-b border-rule/60 mb-1 flex items-center justify-between">
              <span>Plantillas para Importar</span>
              <span className="text-xs bg-paper-3 text-accent px-1.5 py-0.5 rounded-full font-mono">50/30/20</span>
            </div>

            {/* Action 1: Descargar plantilla Excel */}
            <button
              type="button"
              onClick={handleDownloadExcelTemplate}
              className="w-full text-left px-3.5 py-2 text-xs text-ink hover:bg-paper-3 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-input bg-paper-3 text-accent flex items-center justify-center shrink-0">
                <i className="pi pi-file-excel text-xs"></i>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Plantilla Excel (.xlsx)</span>
                <span className="text-xs text-muted">Con Necesidades, Imprevistos y Ahorro</span>
              </div>
            </button>

            {/* Action 2: Descargar plantilla CSV */}
            <button
              type="button"
              onClick={handleDownloadCSVTemplate}
              className="w-full text-left px-3.5 py-2 text-xs text-ink hover:bg-paper-3 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-input bg-paper-2 text-accent flex items-center justify-center shrink-0">
                <i className="pi pi-file text-xs"></i>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">Plantilla CSV (.csv)</span>
                <span className="text-xs text-muted">Compatible con Google Sheets y Numbers</span>
              </div>
            </button>

            {/* Action 3: Ver Guía & Estructura */}
            <button
              type="button"
              onClick={() => {
                setIsImportOpen(false);
                setShowTemplateModal(true);
              }}
              className="w-full text-left px-3.5 py-1.5 text-xs text-muted hover:text-ink hover:bg-paper-3 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <i className="pi pi-info-circle text-xs text-muted" aria-hidden="true"></i>
              <span>Ver estructura de columnas y campos</span>
            </button>

            {/* Divider */}
            <div className="border-t border-rule/60 my-1.5"></div>

            {/* Action 4: Subir archivo */}
            <div className="px-3.5 py-1">
              <button
                type="button"
                onClick={() => {
                  setIsImportOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full calm-btn-primary py-2 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <i className="pi pi-upload text-xs"></i>
                <span>Subir archivo (.xlsx, .csv)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsImportOpen(false);
                  backupInputRef.current?.click();
                }}
                className="w-full mt-1.5 text-left px-0 py-1.5 text-xs text-muted hover:text-ink flex items-center gap-2 transition-colors cursor-pointer"
              >
                <i className="pi pi-history text-xs text-accent"></i>
                <span>Restaurar backup completo (.json)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleImport}
        className="hidden"
      />
      <input
        ref={backupInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleRestoreBackup}
        className="hidden"
      />

      {/* ── Template Structure Guide Modal ── */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Plantilla de Importación de Gastos"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted leading-relaxed">
            Podés armar tu archivo en <strong>Excel</strong> o <strong>Google Sheets</strong> con las siguientes 4 columnas para que la app clasifique automáticamente cada gasto en la categoría correcta:
          </p>

          {/* Table preview */}
          <div className="overflow-x-auto rounded-card border border-rule bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper-3 border-b border-rule text-muted font-bold text-xs">
                <tr>
                  <th className="p-3">Categoría</th>
                  <th className="p-3">Descripción</th>
                  <th className="p-3">Monto</th>
                  <th className="p-3">Moneda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule/60 text-xs font-mono">
                <tr className="hover:bg-paper-3/20">
                  <td className="p-3 font-semibold text-accent">Necesidades</td>
                  <td className="p-3 text-ink font-sans">Alquiler departamento</td>
                  <td className="p-3 font-bold">$180.000</td>
                  <td className="p-3 text-muted">ARS</td>
                </tr>
                <tr className="hover:bg-paper-3/20">
                  <td className="p-3 font-semibold text-accent">Necesidades</td>
                  <td className="p-3 text-ink font-sans">Supermercado mensual</td>
                  <td className="p-3 font-bold">$95.000</td>
                  <td className="p-3 text-muted">ARS</td>
                </tr>
                <tr className="hover:bg-paper-3/20">
                  <td className="p-3 font-medium text-ink">Imprevistos</td>
                  <td className="p-3 text-ink font-sans">Cena con amigos / Salida</td>
                  <td className="p-3 font-bold">$25.000</td>
                  <td className="p-3 text-muted">ARS</td>
                </tr>
                <tr className="hover:bg-paper-3/20">
                  <td className="p-3 font-medium text-ink">Imprevistos</td>
                  <td className="p-3 text-ink font-sans">Arreglo imprevisto auto</td>
                  <td className="p-3 font-bold">$42.000</td>
                  <td className="p-3 text-muted">ARS</td>
                </tr>
                <tr className="hover:bg-paper-3/20">
                  <td className="p-3 font-semibold text-accent">Ahorro</td>
                  <td className="p-3 text-ink font-sans">Fondo de emergencia</td>
                  <td className="p-3 font-bold">$50.000</td>
                  <td className="p-3 text-muted">ARS</td>
                </tr>
                <tr className="hover:bg-paper-3/20">
                  <td className="p-3 font-semibold text-accent">Ahorro</td>
                  <td className="p-3 text-ink font-sans">Compra dólares ahorro</td>
                  <td className="p-3 font-bold">$100</td>
                  <td className="p-3 text-accent font-bold">USD</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tips */}
          <div className="p-3.5 bg-paper-2 border border-accent-soft rounded-card space-y-1.5 text-xs text-ink">
            <p className="font-semibold text-accent flex items-center gap-1.5">
              <i className="pi pi-check-circle"></i>
              <span>Consejo de importación:</span>
            </p>
            <p className="text-xs leading-relaxed">
              También podés usar un archivo con <strong>hojas separadas</strong> llamadas <em>&quot;Necesidades&quot;</em>, <em>&quot;Imprevistos&quot;</em> y <em>&quot;Ahorro&quot;</em>. La app reconoce ambos formatos automáticamente.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleDownloadExcelTemplate}
              className="w-full sm:flex-1 calm-btn-primary py-2.5 text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="pi pi-file-excel text-xs"></i>
              <span>Descargar Plantilla Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadCSVTemplate}
              className="w-full sm:flex-1 calm-btn-secondary py-2.5 text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="pi pi-file text-xs"></i>
              <span>Descargar Plantilla CSV</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
