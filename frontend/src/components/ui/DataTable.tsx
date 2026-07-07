import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { TableSkeleton } from './Skeleton';
import EmptyState from './EmptyState';

interface DataTableProps<T> {
  columns: ColumnDef<T, any>[];
  data: T[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  maxHeight?: string;
}

export default function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription,
  onRowClick,
  maxHeight = 'none',
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) return <TableSkeleton cols={columns.length} />;
  if (!data.length) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  return (
    <div className="overflow-auto" style={maxHeight !== 'none' ? { maxHeight } : undefined}>
      <table className="w-full min-w-max text-left text-sm">
        <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/80 dark:text-gray-400">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const dir = header.column.getIsSorted();
                return (
                  <th key={header.id} className="whitespace-nowrap px-4 py-3 font-semibold">
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        disabled={!canSort}
                        onClick={header.column.getToggleSortingHandler()}
                        className={`flex items-center gap-1 ${canSort ? 'cursor-pointer select-none hover:text-gray-800 dark:hover:text-gray-200' : 'cursor-default'}`}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort &&
                          (dir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : dir === 'desc' ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          ))}
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              className={`transition ${onRowClick ? 'cursor-pointer hover:bg-primary-50/50 dark:hover:bg-gray-800/60' : ''}`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="whitespace-nowrap px-4 py-3 text-gray-700 dark:text-gray-300">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
