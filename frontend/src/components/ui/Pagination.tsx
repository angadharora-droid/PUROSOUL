import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, pages, total, onPageChange }: PaginationProps) {
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Page <span className="font-medium text-gray-900 dark:text-white">{page}</span> of{' '}
        <span className="font-medium text-gray-900 dark:text-white">{pages}</span> · {total} record
        {total === 1 ? '' : 's'}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
