import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="rounded-full bg-gray-100 p-3 text-gray-400 dark:bg-gray-800">
        {icon ?? <Inbox className="h-7 w-7" />}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
