import type { Expense } from '@/interfaces/Expense';
import type { Transfer } from '@/interfaces/Transfer';
import type { SplitPercentages } from '@/interfaces/Income';

export interface ExcelExportData {
  month: string;
  totalIncome: number;
  globalSplit: SplitPercentages;
  cash: { needs: number; wants: number; savings: number };
  needs: Expense[];
  wants: Expense[];
  savings: Expense[];
  transfers: Transfer[];
}

export interface ExcelImportResult {
  summary: {
    month: string;
    totalIncome: number;
    needsPct: number;
    wantsPct: number;
    savingsPct: number;
  };
  needs: { description: string; amount: number; currency: string }[];
  wants: { description: string; amount: number; currency: string }[];
  savings: { description: string; amount: number; currency: string }[];
  transfers: { from: string; to: string; amount: number; type: string }[];
}

/**
 * Export current month data to a multi-sheet .xlsx file.
 * xlsx is dynamically imported — never in the initial bundle (~300KB gz).
 */
export async function exportToExcel(data: ExcelExportData, filename: string): Promise<void> {
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();

  // --- Sheet: Resumen ---
  const resumen = [{
    Month: data.month,
    'Total Income': data.totalIncome,
    'Needs %': data.globalSplit.needs,
    'Wants %': data.globalSplit.wants,
    'Savings %': data.globalSplit.savings,
    'Needs Pool': data.cash.needs,
    'Wants Pool': data.cash.wants,
    'Savings Pool': data.cash.savings,
  }];
  const wsResumen = XLSX.utils.json_to_sheet(resumen);
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  // --- Category sheets (skip auto-loan transfer expenses) ---
  const categories: { label: string; items: Expense[] }[] = [
    { label: 'Necesidades', items: data.needs },
    { label: 'Imprevistos', items: data.wants },
    { label: 'Ahorro', items: data.savings },
  ];

  for (const cat of categories) {
    const rows = cat.items
      .filter(e => !e.isTransfer)
      .map(e => ({
        Description: e.description,
        Amount: e.amount,
        Currency: e.currency || 'ARS',
      }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, cat.label);
  }

  // --- Sheet: Transferencias ---
  const transferRows = data.transfers.map(t => ({
    From: t.from,
    To: t.to,
    Amount: t.amount,
    Type: t.isAutomatic ? 'Auto' : 'Manual',
  }));
  const wsTransfers = XLSX.utils.json_to_sheet(transferRows);
  XLSX.utils.book_append_sheet(wb, wsTransfers, 'Transferencias');

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Parse a .xlsx file and return structured data for the app.
 * Validates expected sheet names and returns partial data on missing sheets.
 */
export async function importFromExcel(file: File): Promise<ExcelImportResult> {
  const XLSX = await import('xlsx');

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  // --- Parse Resumen ---
  const resumenSheet = wb.Sheets['Resumen'];
  if (!resumenSheet) throw new Error('Sheet "Resumen" not found in the file');
  const resumenRows: Record<string, string | number>[] = XLSX.utils.sheet_to_json(resumenSheet);
  const resumen = resumenRows[0];
  if (!resumen) throw new Error('Resumen sheet is empty');

  const summary = {
    month: String(resumen['Month'] || ''),
    totalIncome: Number(resumen['Total Income'] || 0),
    needsPct: Number(resumen['Needs %'] || 50),
    wantsPct: Number(resumen['Wants %'] || 30),
    savingsPct: Number(resumen['Savings %'] || 20),
  };

  // --- Parse category sheets ---
  const parseCategory = (sheetName: string) => {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return [];
    const rows: Record<string, string | number>[] = XLSX.utils.sheet_to_json(sheet);
    return rows.map(r => ({
      description: String(r['Description'] || ''),
      amount: Number(r['Amount'] || 0),
      currency: String(r['Currency'] || 'ARS'),
    }));
  };

  const needs = parseCategory('Necesidades');
  const wants = parseCategory('Imprevistos');
  const savings = parseCategory('Ahorro');

  // --- Parse Transferencias ---
  const transferSheet = wb.Sheets['Transferencias'];
  let transfers: { from: string; to: string; amount: number; type: string }[] = [];
  if (transferSheet) {
    const rows: Record<string, string | number>[] = XLSX.utils.sheet_to_json(transferSheet);
    transfers = rows.map(r => ({
      from: String(r['From'] || ''),
      to: String(r['To'] || ''),
      amount: Number(r['Amount'] || 0),
      type: String(r['Type'] || 'Manual'),
    }));
  }

  return { summary, needs, wants, savings, transfers };
}
