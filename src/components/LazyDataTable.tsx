'use client';
import dynamic from 'next/dynamic';

/**
 * Lazy-loaded DataTable — uses next/dynamic with ssr: false to avoid
 * shipping PrimeReact DataTable to the initial client bundle.
 *
 * Usage:
 * ```tsx
 * import { LazyDataTable } from '@/components/LazyDataTable';
 *
 * <LazyDataTable
 *   value={items}
 *   columns={[{ field: 'name', header: 'Name' }]}
 * />
 * ```
 *
 * Show a skeleton while loading:
 * ```tsx
 * <LazyDataTable
 *   value={items}
 *   columns={cols}
 *   loading
 * />
 * ```
 */

export const LazyDataTable = dynamic(
  () => import('@/components/DataTable').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="border border-cds-border rounded-cds-lg bg-cds-surface p-4">
        <div className="h-4 w-32 bg-cds-surface-dark rounded animate-pulse mb-3" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-cds-surface-dark rounded animate-pulse" />
          <div className="h-3 w-4/5 bg-cds-surface-dark rounded animate-pulse" />
          <div className="h-3 w-3/5 bg-cds-surface-dark rounded animate-pulse" />
        </div>
      </div>
    ),
  }
);

// Re-export types for convenience
export type { DataTableProps, DataTableColumn } from '@/components/DataTable';
