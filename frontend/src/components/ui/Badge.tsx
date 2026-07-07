import type { RegistrationStatus } from '@/types';
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from '@/lib/status';

export function StatusBadge({ status, short = false }: { status: RegistrationStatus; short?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_BADGE_CLASSES[status]}`}
    >
      {short ? status.charAt(0) + status.slice(1).toLowerCase() : STATUS_LABELS[status]}
    </span>
  );
}

export function BooleanBadge({ value, yes = 'Yes', no = 'No' }: { value: boolean; yes?: string; no?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        value
          ? 'bg-emerald-100 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'bg-gray-200 text-gray-700 ring-gray-500/20 dark:bg-gray-500/10 dark:text-gray-400'
      }`}
    >
      {value ? yes : no}
    </span>
  );
}
