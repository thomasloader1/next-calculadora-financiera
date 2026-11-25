import type { Expense, MonthBudget } from '@/interfaces/Expense';
import type { Transfer } from '@/interfaces/Transfer';
import type { SplitPercentages } from '@/interfaces/Income';
import { parseAmount, isStorableAmount } from './validation';

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
 * Export budget data as a standard .csv file compatible with Google Sheets, Excel, LibreOffice.
 */
export function exportToCSV(data: ExcelExportData, filename: string): void {
  const lines: string[] = [];

  lines.push(`"Resumen de Presupuesto","${data.month}"`);
  lines.push(`"Ingreso Total",${data.totalIncome}`);
  lines.push(`"Distribución (%)","Necesidades: ${data.globalSplit.needs}%","Imprevistos: ${data.globalSplit.wants}%","Ahorro: ${data.globalSplit.savings}%"`);
  lines.push(`"Fondos Disponibles","Necesidades: ${data.cash.needs}","Imprevistos: ${data.cash.wants}","Ahorro: ${data.cash.savings}"`);
  lines.push('');
  lines.push('"Categoría","Descripción","Monto","Moneda"');

  const addCategory = (label: string, items: Expense[]) => {
    for (const item of items) {
      if (item.isTransfer) continue;
      const desc = `"${(item.description || '').replace(/"/g, '""')}"`;
      lines.push(`"${label}",${desc},${item.amount},"${item.currency || 'ARS'}"`);
    }
  };

  addCategory('Necesidades', data.needs);
  addCategory('Imprevistos', data.wants);
  addCategory('Ahorro', data.savings);

  if (data.transfers.length > 0) {
    lines.push('');
    lines.push('"Transferencias Entre Fondos"');
    lines.push('"Origen","Destino","Monto","Tipo"');
    for (const t of data.transfers) {
      lines.push(`"${t.from}","${t.to}",${t.amount},"${t.isAutomatic ? 'Auto' : 'Manual'}"`);
    }
  }

  const csvContent = '\uFEFF' + lines.join('\r\n');
  if (typeof document === 'undefined') return;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Format and copy data as Tab-Separated Values (TSV) to clipboard,
 * ready to paste with Ctrl+V / Cmd+V directly into Google Sheets.
 */
export async function copyForSpreadsheet(data: ExcelExportData): Promise<void> {
  const rows: string[] = [];

  rows.push(`Mes\t${data.month}`);
  rows.push(`Ingreso Total\t${data.totalIncome}`);
  rows.push(`Distribución\tNecesidades: ${data.globalSplit.needs}%\tImprevistos: ${data.globalSplit.wants}%\tAhorro: ${data.globalSplit.savings}%`);
  rows.push(`Saldos\tNecesidades: ${data.cash.needs}\tImprevistos: ${data.cash.wants}\tAhorro: ${data.cash.savings}`);
  rows.push('');
  rows.push('Categoría\tDescripción\tMonto\tMoneda');

  const addItems = (label: string, items: Expense[]) => {
    for (const item of items) {
      if (item.isTransfer) continue;
      rows.push(`${label}\t${item.description || ''}\t${item.amount}\t${item.currency || 'ARS'}`);
    }
  };

  addItems('Necesidades', data.needs);
  addItems('Imprevistos', data.wants);
  addItems('Ahorro', data.savings);

  if (data.transfers.length > 0) {
    rows.push('');
    rows.push('Transferencias');
    rows.push('Origen\tDestino\tMonto\tTipo');
    for (const t of data.transfers) {
      rows.push(`${t.from}\t${t.to}\t${t.amount}\t${t.isAutomatic ? 'Automática' : 'Manual'}`);
    }
  }

  const tsv = rows.join('\n');
  await navigator.clipboard.writeText(tsv);
}

/**
 * Download a pre-formatted Excel template (.xlsx) for importing expenses into 50/30/20.
 */
export async function downloadExcelTemplate(): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // --- Sheet 1: Gastos (Recomendado) ---
  const sampleExpenses = [
    { Categoría: 'Necesidades', Descripción: 'Alquiler departamento', Monto: 180000, Moneda: 'ARS' },
    { Categoría: 'Necesidades', Descripción: 'Supermercado mensual', Monto: 95000, Moneda: 'ARS' },
    { Categoría: 'Necesidades', Descripción: 'Servicios (Luz, Agua, Internet)', Monto: 28000, Moneda: 'ARS' },
    { Categoría: 'Necesidades', Descripción: 'Transporte / SUBE / Combustible', Monto: 22000, Moneda: 'ARS' },
    { Categoría: 'Imprevistos', Descripción: 'Cena con amigos / Salida', Monto: 25000, Moneda: 'ARS' },
    { Categoría: 'Imprevistos', Descripción: 'Ropa / Indumentaria', Monto: 35000, Moneda: 'ARS' },
    { Categoría: 'Imprevistos', Descripción: 'Arreglo imprevisto del auto', Monto: 42000, Moneda: 'ARS' },
    { Categoría: 'Ahorro', Descripción: 'Fondo de emergencia', Monto: 50000, Moneda: 'ARS' },
    { Categoría: 'Ahorro', Descripción: 'Inversión Plazo Fijo / FCI', Monto: 45000, Moneda: 'ARS' },
    { Categoría: 'Ahorro', Descripción: 'Compra dólares ahorro', Monto: 100, Moneda: 'USD' },
  ];
  const wsGastos = XLSX.utils.json_to_sheet(sampleExpenses);
  wsGastos['!cols'] = [{ wch: 16 }, { wch: 35 }, { wch: 14 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsGastos, 'Gastos');

  // --- Sheet 2: Instrucciones ---
  const instructions = [
    { Instrucción: '1. Categorías válidas', Detalle: 'Necesidades (50%), Imprevistos (30%), Ahorro (20%)' },
    { Instrucción: '2. Columnas obligatorias', Detalle: 'Categoría, Descripción, Monto' },
    { Instrucción: '3. Columna opcional', Detalle: 'Moneda (ARS o USD, por defecto ARS)' },
    { Instrucción: '4. Hojas individuales', Detalle: 'También podés crear hojas llamadas "Necesidades", "Imprevistos" y "Ahorro"' },
  ];
  const wsInst = XLSX.utils.json_to_sheet(instructions);
  wsInst['!cols'] = [{ wch: 25 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucciones');

  XLSX.writeFile(wb, 'plantilla-calculadora-50-30-20.xlsx');
}

/**
 * Download a pre-formatted CSV template (.csv) for Google Sheets / Excel.
 */
export function downloadCSVTemplate(): void {
  const lines: string[] = [
    '"Categoría","Descripción","Monto","Moneda"',
    '"Necesidades","Alquiler departamento",180000,"ARS"',
    '"Necesidades","Supermercado mensual",95000,"ARS"',
    '"Necesidades","Servicios (Luz, Agua, Internet)",28000,"ARS"',
    '"Necesidades","Transporte / Combustible",22000,"ARS"',
    '"Imprevistos","Cena con amigos / Salidas",25000,"ARS"',
    '"Imprevistos","Ropa / Indumentaria",35000,"ARS"',
    '"Imprevistos","Arreglo imprevisto",42000,"ARS"',
    '"Ahorro","Fondo de emergencia",50000,"ARS"',
    '"Ahorro","Inversión FCI / Plazo Fijo",45000,"ARS"',
    '"Ahorro","Compra dólares ahorro",100,"USD"',
  ];

  const csvContent = '\uFEFF' + lines.join('\r\n');
  if (typeof document === 'undefined') return;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla-calculadora-50-30-20.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function matchCategory(val: string): 'needs' | 'wants' | 'savings' | null {
  const norm = normalizeKey(val);
  if (norm.includes('neces') || norm.includes('fijo') || norm === 'needs') return 'needs';
  if (norm.includes('imprev') || norm.includes('deseo') || norm.includes('flex') || norm.includes('ocio') || norm === 'wants') return 'wants';
  if (norm.includes('ahorr') || norm.includes('inver') || norm.includes('futuro') || norm === 'savings') return 'savings';
  return null;
}

/**
 * Parse an .xlsx, .xls or .csv file and return structured data for the app.
 * Supports:
 * - Single-sheet format with columns (Categoría, Descripción, Monto, Moneda)
 * - Multi-sheet format with separate sheets ("Necesidades", "Imprevistos", "Ahorro")
 * - With or without a "Resumen" sheet
 */
export async function importFromExcel(file: File): Promise<ExcelImportResult> {
  const XLSX = await import('xlsx');

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  // Default summary in case "Resumen" sheet is not present (e.g. user template)
  let summary = {
    month: '',
    totalIncome: 0,
    needsPct: 50,
    wantsPct: 30,
    savingsPct: 20,
  };

  const resumenSheet = wb.Sheets['Resumen'] || wb.Sheets['resumen'];
  if (resumenSheet) {
    const resumenRows: Record<string, string | number>[] = XLSX.utils.sheet_to_json(resumenSheet);
    const r = resumenRows[0];
    if (r) {
      summary = {
        month: String(r['Month'] || r['Mes'] || ''),
        totalIncome: Number(r['Total Income'] || r['Ingreso Total'] || 0),
        needsPct: Number(r['Needs %'] || r['Necesidades %'] || 50),
        wantsPct: Number(r['Wants %'] || r['Imprevistos %'] || 30),
        savingsPct: Number(r['Savings %'] || r['Ahorro %'] || 20),
      };
    }
  }

  const needs: { description: string; amount: number; currency: string }[] = [];
  const wants: { description: string; amount: number; currency: string }[] = [];
  const savings: { description: string; amount: number; currency: string }[] = [];

  // Check if there is a unified table with a "Categoría" column across sheets
  let foundUnifiedRows = false;

  for (const sheetName of wb.SheetNames) {
    if (normalizeKey(sheetName) === 'resumen' || normalizeKey(sheetName) === 'instrucciones') continue;

    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);
    if (rawRows.length === 0) continue;

    // Check headers of the first row
    const firstRow = rawRows[0];
    const keys = Object.keys(firstRow).map(k => ({ original: k, normalized: normalizeKey(k) }));
    const categoryKeyObj = keys.find(k => k.normalized.includes('categ') || k.normalized === 'rubro' || k.normalized === 'tipo');

    if (categoryKeyObj) {
      // It's a unified table!
      foundUnifiedRows = true;
      const descKeyObj = keys.find(k => k.normalized.includes('desc') || k.normalized.includes('concep') || k.normalized.includes('detall') || k.normalized === 'gasto');
      const amountKeyObj = keys.find(k => k.normalized.includes('monto') || k.normalized.includes('import') || k.normalized.includes('amount') || k.normalized.includes('valor') || k.normalized === 'total');
      const currKeyObj = keys.find(k => k.normalized.includes('moneda') || k.normalized.includes('currency'));

      for (const row of rawRows) {
        const rawCat = String(row[categoryKeyObj.original] || '');
        const matched = matchCategory(rawCat);
        if (!matched) continue;

        const description = descKeyObj ? String(row[descKeyObj.original] || 'Gasto') : 'Gasto';
        const rawAmt = amountKeyObj ? row[amountKeyObj.original] : 0;
        const amount = parseAmount(rawAmt as string | number);
        if (!isStorableAmount(amount)) continue;

        const rawCurr = currKeyObj ? String(row[currKeyObj.original] || 'ARS').trim().toUpperCase() : 'ARS';
        const currency = rawCurr === 'USD' ? 'USD' : 'ARS';

        const item = { description, amount, currency };
        if (matched === 'needs') needs.push(item);
        else if (matched === 'wants') wants.push(item);
        else if (matched === 'savings') savings.push(item);
      }
    }
  }

  // If no unified rows were found, parse individual sheets ("Necesidades", "Imprevistos", "Ahorro")
  if (!foundUnifiedRows) {
    const parseCategorySheet = (targetCategory: 'needs' | 'wants' | 'savings') => {
      for (const sheetName of wb.SheetNames) {
        if (matchCategory(sheetName) !== targetCategory) continue;
        const sheet = wb.Sheets[sheetName];
        if (!sheet) continue;
        const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);
        if (rawRows.length === 0) continue;

        const keys = Object.keys(rawRows[0]).map(k => ({ original: k, normalized: normalizeKey(k) }));
        const descKeyObj = keys.find(k => k.normalized.includes('desc') || k.normalized.includes('concep') || k.normalized.includes('detall') || k.normalized === 'gasto');
        const amountKeyObj = keys.find(k => k.normalized.includes('monto') || k.normalized.includes('import') || k.normalized.includes('amount') || k.normalized.includes('valor') || k.normalized === 'total');
        const currKeyObj = keys.find(k => k.normalized.includes('moneda') || k.normalized.includes('currency'));

        for (const r of rawRows) {
          const description = descKeyObj ? String(r[descKeyObj.original] || 'Gasto') : 'Gasto';
          const rawAmt = amountKeyObj ? r[amountKeyObj.original] : 0;
          const amount = parseAmount(rawAmt as string | number);
          if (!isStorableAmount(amount)) continue;

          const rawCurr = currKeyObj ? String(r[currKeyObj.original] || 'ARS').trim().toUpperCase() : 'ARS';
          const currency = rawCurr === 'USD' ? 'USD' : 'ARS';

          const item = { description, amount, currency };
          if (targetCategory === 'needs') needs.push(item);
          else if (targetCategory === 'wants') wants.push(item);
          else if (targetCategory === 'savings') savings.push(item);
        }
      }
    };

    parseCategorySheet('needs');
    parseCategorySheet('wants');
    parseCategorySheet('savings');
  }

  // --- Parse Transferencias (optional) ---
  const transferSheet = wb.Sheets['Transferencias'] || wb.Sheets['transferencias'];
  let transfers: { from: string; to: string; amount: number; type: string }[] = [];
  if (transferSheet) {
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(transferSheet);
    transfers = rows.map(r => ({
      from: String(r['From'] || r['Origen'] || ''),
      to: String(r['To'] || r['Destino'] || ''),
      amount: Number(r['Amount'] || r['Monto'] || 0),
      type: String(r['Type'] || r['Tipo'] || 'Manual'),
    }));
  }

  if (needs.length === 0 && wants.length === 0 && savings.length === 0) {
    throw new Error('No se encontraron gastos válidos con las columnas "Categoría", "Descripción" y "Monto" (o en hojas individuales)');
  }

  return { summary, needs, wants, savings, transfers };
}

// ---------------------------------------------------------------------------
// Full export / backup (all months)
// ---------------------------------------------------------------------------

export type MonthMap = Record<string, MonthBudget>;

export const BACKUP_FORMAT = 'calculadora-503020-backup';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  months: MonthMap;
}

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function sumAmounts(items: { amount: number }[] | undefined): number {
  return (items || []).reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
}

/**
 * Export every month to a single .xlsx: one "Resumen" sheet (one row per month)
 * plus one detail sheet per month with all expenses.
 */
export async function exportAllToExcel(months: MonthMap, filename: string): Promise<void> {
  const keys = Object.keys(months).filter(k => MONTH_KEY_RE.test(k)).sort();
  if (keys.length === 0) throw new Error('No hay meses para exportar');

  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const resumen = keys.map(k => {
    const m = months[k];
    const totalIncome = m.cash?.totalIncome ?? sumAmounts(m.incomes);
    const realNeeds = (m.needs || []).filter(e => !e.isTransfer);
    const realWants = (m.wants || []).filter(e => !e.isTransfer);
    const realSavings = (m.savings || []).filter(e => !e.isTransfer);
    return {
      Month: k,
      'Total Income': totalIncome,
      'Needs Spent': sumAmounts(realNeeds),
      'Wants Spent': sumAmounts(realWants),
      'Savings Spent': sumAmounts(realSavings),
      'Needs Pool': m.cash?.needs ?? 0,
      'Wants Pool': m.cash?.wants ?? 0,
      'Savings Pool': m.cash?.savings ?? 0,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), 'Resumen');

  for (const k of keys) {
    const m = months[k];
    const rows: Record<string, string | number>[] = [];
    const add = (label: string, items: Expense[] | undefined) => {
      for (const e of items || []) {
        if (e.isTransfer) continue;
        rows.push({ Category: label, Description: e.description, Amount: e.amount, Currency: e.currency || 'ARS' });
      }
    };
    for (const inc of m.incomes || []) {
      rows.push({ Category: 'Ingreso', Description: inc.description, Amount: inc.amount, Currency: inc.currency || 'ARS' });
    }
    add('Necesidades', m.needs);
    add('Imprevistos', m.wants);
    add('Ahorro', m.savings);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), k);
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/** Builds a JSON-serializable backup of all months. */
export function buildBackup(months: MonthMap, now: Date = new Date()): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    months,
  };
}

/**
 * Validates and parses backup JSON text. Throws a user-facing Error when invalid.
 * Months with invalid keys or shapes are rejected rather than silently dropped.
 */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido');
  }
  if (!raw || typeof raw !== 'object') throw new Error('Formato de backup inválido');
  const obj = raw as Record<string, unknown>;
  if (obj.format !== BACKUP_FORMAT) throw new Error('El archivo no es un backup de la calculadora');
  if (obj.version !== BACKUP_VERSION) throw new Error(`Versión de backup no soportada: ${String(obj.version)}`);
  if (!obj.months || typeof obj.months !== 'object' || Array.isArray(obj.months)) {
    throw new Error('El backup no contiene meses');
  }

  const months: MonthMap = {};
  for (const [key, value] of Object.entries(obj.months as Record<string, unknown>)) {
    if (!MONTH_KEY_RE.test(key)) throw new Error(`Mes inválido en el backup: ${key}`);
    const m = value as Record<string, unknown> | null;
    if (!m || typeof m !== 'object') throw new Error(`Datos inválidos para el mes ${key}`);
    for (const field of ['needs', 'wants', 'savings'] as const) {
      if (m[field] !== undefined && !Array.isArray(m[field])) {
        throw new Error(`Datos inválidos para el mes ${key} (${field})`);
      }
    }
    months[key] = {
      ...(m as unknown as MonthBudget),
      needs: (m.needs as Expense[]) || [],
      wants: (m.wants as Expense[]) || [],
      savings: (m.savings as Expense[]) || [],
    };
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : '',
    months,
  };
}

/** Triggers a browser download of the backup as .json */
export function downloadBackupJSON(months: MonthMap, filename: string): void {
  if (typeof document === 'undefined') return;
  const json = JSON.stringify(buildBackup(months), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
