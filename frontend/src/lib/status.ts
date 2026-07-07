import type { RegistrationStatus } from '@/types';

export const STATUS_LABELS: Record<RegistrationStatus, string> = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  EXPIRED: 'Expired',
};

export const STATUS_BADGE_CLASSES: Record<RegistrationStatus, string> = {
  ACTIVE: 'bg-blue-100 text-blue-800 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400',
  COMPLETED: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400',
  EXPIRED: 'bg-gray-200 text-gray-700 ring-gray-500/20 dark:bg-gray-500/10 dark:text-gray-400',
};
