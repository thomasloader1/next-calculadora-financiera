import { describe, it, expect, vi } from 'vitest';
import {
  exportToExcel,
  exportToCSV,
  copyForSpreadsheet,
  downloadCSVTemplate,
  downloadExcelTemplate,
  importFromExcel,
  ExcelExportData,
} from '../excel';
import * as XLSX from 'xlsx';

// Never write real files to disk from tests
vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('xlsx')>();
  return { ...actual, writeFile: vi.fn() };
});

const mockData: ExcelExportData = {
  month: '2026-11',
  totalIncome: 100000,
  globalSplit: { needs: 50, wants: 30, savings: 20 },
  cash: { needs: 50000, wants: 30000, savings: 20000 },
  needs: [{ id: '1', description: 'Alquiler', amount: 35000, currency: 'ARS' }],
  wants: [{ id: '2', description: 'Restaurante', amount: 15000, currency: 'ARS' }],
  savings: [{ id: '3', description: 'FCI', amount: 10000, currency: 'ARS' }],
  transfers: [],
};

describe('excel & spreadsheet export', () => {
  it('exportToCSV generates csv with bom and formatted categories', () => {
    let capturedBlob: Blob | null = null;
    let clicked = false;

    // Mock DOM elements
    const mockAnchor = { href: '', download: '', click: () => { clicked = true; } };
    (globalThis as any).document = {
      createElement: () => mockAnchor,
      body: {
        appendChild: () => {},
        removeChild: () => {},
      },
    };

    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = (blob: any) => {
      capturedBlob = blob;
      return 'blob:mock-url';
    };
    URL.revokeObjectURL = () => {};

    // Run export
    exportToCSV(mockData, 'test-budget');

    expect(capturedBlob).not.toBeNull();
    expect((capturedBlob as any).type).toContain('text/csv');

    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('copyForSpreadsheet writes TSV to clipboard', async () => {
    let clipboardText = '';
    const mockClipboard = {
      writeText: async (text: string) => {
        clipboardText = text;
      },
    };
    Object.assign(navigator, { clipboard: mockClipboard });

    await copyForSpreadsheet(mockData);

    expect(clipboardText).toContain('Mes\t2026-11');
    expect(clipboardText).toContain('Alquiler\t35000\tARS');
    expect(clipboardText).toContain('Restaurante\t15000\tARS');
  });

  it('downloadCSVTemplate creates and triggers download of template csv', () => {
    let capturedBlob: Blob | null = null;
    let downloadName = '';

    const mockAnchor = { href: '', download: '', click: () => {} };
    (globalThis as any).document = {
      createElement: () => mockAnchor,
      body: {
        appendChild: () => {},
        removeChild: () => {},
      },
    };

    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = (blob: any) => {
      capturedBlob = blob;
      return 'blob:mock-csv';
    };

    downloadCSVTemplate();

    expect(mockAnchor.download).toBe('plantilla-calculadora-50-30-20.csv');
    expect(capturedBlob).not.toBeNull();

    URL.createObjectURL = originalCreateObjectURL;
  });

  it('importFromExcel parses unified sheet with category column', async () => {
    const wb = XLSX.utils.book_new();
    const rows = [
      { Categoría: 'Necesidades', Descripción: 'Alquiler', Monto: 50000, Moneda: 'ARS' },
      { Categoría: 'Imprevistos', Descripción: 'Salida', Monto: 20000, Moneda: 'ARS' },
      { Categoría: 'Ahorro', Descripción: 'Dólares', Monto: 100, Moneda: 'USD' },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos');

    const u8 = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const file = new File([u8], 'template.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const result = await importFromExcel(file);

    expect(result.needs).toHaveLength(1);
    expect(result.needs[0]).toEqual({ description: 'Alquiler', amount: 50000, currency: 'ARS' });

    expect(result.wants).toHaveLength(1);
    expect(result.wants[0]).toEqual({ description: 'Salida', amount: 20000, currency: 'ARS' });

    expect(result.savings).toHaveLength(1);
    expect(result.savings[0]).toEqual({ description: 'Dólares', amount: 100, currency: 'USD' });
  });

  it('importFromExcel parses individual category sheets without Resumen', async () => {
    const wb = XLSX.utils.book_new();
    const needsRows = [{ Descripción: 'Supermercado', Monto: 30000 }];
    const wantsRows = [{ Descripción: 'Ropa', Monto: 12000 }];
    const savingsRows = [{ Descripción: 'Plazo fijo', Monto: 15000 }];

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(needsRows), 'Necesidades');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(wantsRows), 'Imprevistos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(savingsRows), 'Ahorro');

    const u8 = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const file = new File([u8], 'categories.xlsx');

    const result = await importFromExcel(file);

    expect(result.needs[0].description).toBe('Supermercado');
    expect(result.wants[0].description).toBe('Ropa');
    expect(result.savings[0].description).toBe('Plazo fijo');
  });
});

describe('full backup (all months)', () => {
  const months = {
    '2026-10': {
      schemaVersion: 2 as const,
      totalAmount: 100000,
      cash: { needs: 50000, wants: 30000, savings: 20000, totalIncome: 100000, split: { needs: 50, wants: 30, savings: 20 } },
      needs: [{ id: '1', description: 'Alquiler', amount: 35000 }],
      wants: [],
      savings: [],
    },
  };

  it('round-trips through buildBackup -> JSON -> parseBackup', async () => {
    const { buildBackup, parseBackup } = await import('../excel');
    const text = JSON.stringify(buildBackup(months, new Date('2026-11-23T00:00:00Z')));
    const parsed = parseBackup(text);
    expect(parsed.exportedAt).toBe('2026-11-23T00:00:00.000Z');
    expect(parsed.months['2026-10'].needs[0].description).toBe('Alquiler');
  });

  it('rejects invalid JSON', async () => {
    const { parseBackup } = await import('../excel');
    expect(() => parseBackup('not json')).toThrow('JSON válido');
  });

  it('rejects files that are not calculator backups', async () => {
    const { parseBackup } = await import('../excel');
    expect(() => parseBackup(JSON.stringify({ months: {} }))).toThrow('no es un backup');
  });

  it('rejects invalid month keys and shapes', async () => {
    const { parseBackup, BACKUP_FORMAT, BACKUP_VERSION } = await import('../excel');
    const base = { format: BACKUP_FORMAT, version: BACKUP_VERSION };
    expect(() => parseBackup(JSON.stringify({ ...base, months: { 'nov-2026': {} } }))).toThrow('Mes inválido');
    expect(() => parseBackup(JSON.stringify({ ...base, months: { '2026-11': { needs: 'x' } } }))).toThrow('needs');
  });

  it('exportAllToExcel writes a summary sheet plus one sheet per month', async () => {
    const { exportAllToExcel } = await import('../excel');
    const writeFile = vi.mocked(XLSX.writeFile);
    writeFile.mockClear();
    await exportAllToExcel(months, 'todo');
    expect(writeFile.mock.calls[0][1]).toBe('todo.xlsx');
    const wb = writeFile.mock.calls[0][0];
    expect(wb.SheetNames).toEqual(['Resumen', '2026-10']);
    const resumen = XLSX.utils.sheet_to_json<Record<string, number>>(wb.Sheets['Resumen']);
    expect(resumen[0]['Needs Spent']).toBe(35000);
  });

  it('exportAllToExcel fails clearly when there are no months', async () => {
    const { exportAllToExcel } = await import('../excel');
    await expect(exportAllToExcel({}, 'x')).rejects.toThrow('No hay meses');
  });
});
