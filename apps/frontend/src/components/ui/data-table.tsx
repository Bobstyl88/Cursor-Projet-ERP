'use client';

import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  meta,
  onPageChange,
  onRowClick,
  isLoading,
  emptyMessage = 'No data found',
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500',
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => (
                <tr
                  key={item.id || rowIndex}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-gray-50',
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'whitespace-nowrap px-6 py-4 text-sm text-gray-900',
                        col.className,
                      )}
                    >
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-3">
          <p className="text-sm text-gray-700">
            Showing{' '}
            <span className="font-medium">
              {(meta.page - 1) * meta.limit + 1}
            </span>{' '}
            to{' '}
            <span className="font-medium">
              {Math.min(meta.page * meta.limit, meta.total)}
            </span>{' '}
            of <span className="font-medium">{meta.total}</span> results
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(meta.page - 1)}
              disabled={meta.page <= 1}
              className="btn-secondary py-1.5 px-3 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange?.(meta.page + 1)}
              disabled={meta.page >= meta.totalPages}
              className="btn-secondary py-1.5 px-3 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
