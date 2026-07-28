'use client';
import React from 'react';
import { DataTable as PrimeDataTable } from 'primereact/datatable';
import { Column, ColumnProps } from 'primereact/column';

/**
 * Generic DataTable wrapper for PrimeReact with CDS styling.
 *
 * This is a thin wrapper — it delegates rendering to PrimeReact's DataTable
 * in unstyled mode. CDS pass-through classes are applied globally via
 * PrimeReactProvider (primereact-pt.ts), so no per-instance styling is needed.
 *
 * Usage:
 * ```tsx
 * <DataTable
 *   value={items}
 *   columns={[
 *     { field: 'name', header: 'Name', sortable: true },
 *     { field: 'amount', header: 'Amount', body: (row) => formatCurrency(row.amount) },
 *   ]}
 *   paginator
 *   rows={10}
 * />
 * ```
 */

export interface DataTableColumn extends Omit<ColumnProps, 'field' | 'header'> {
  /** Data field key — maps to the row data property */
  field: string;
  /** Column header label */
  header: string;
}

export interface DataTableProps extends Record<string, unknown> {
  /** Row data array */
  value?: Record<string, unknown>[];
  /** Typed column definitions */
  columns: DataTableColumn[];
  /** Empty state message */
  emptyMessage?: string;
  /** Enable pagination */
  paginator?: boolean;
  /** Rows per page (when paginator is true) */
  rows?: number;
  /** Rows per page options */
  rowsPerPageOptions?: number[];
  /** Enable sorting */
  sortable?: boolean;
  /** Sort field */
  sortField?: string;
  /** Sort order: 1 = ascending, -1 = descending */
  sortOrder?: number;
  /** Show grid lines */
  showGridlines?: boolean;
  /** Stripe rows */
  stripedRows?: boolean;
  /** Table style */
  tableStyle?: React.CSSProperties;
  /** Additional className */
  className?: string;
  /** Loading state */
  loading?: boolean;
  /** Row click handler */
  onRowClick?: (e: { data: Record<string, unknown>; index: number }) => void;
  /** Selection */
  selection?: unknown;
  /** Selection change handler */
  onSelectionChange?: (e: { value: unknown }) => void;
  /** Selection mode */
  selectionMode?: 'single' | 'multiple' | null;
  /** Data key for unique row identification */
  dataKey?: string;
  /** Global filter fields */
  globalFilterFields?: string[];
  /** Filter display mode */
  filterDisplay?: 'row' | 'menu';
}

function DataTableInner({
  columns,
  emptyMessage = 'Sin resultados',
  ...props
}: DataTableProps) {
  return (
    <PrimeDataTable emptyMessage={emptyMessage} {...(props as any)}>
      {columns.map((col) => (
        <Column key={col.field} {...col} />
      ))}
    </PrimeDataTable>
  );
}

// Named export (for lazy dynamic import)
export { DataTableInner as DataTable };

// Default export
export default DataTableInner;
