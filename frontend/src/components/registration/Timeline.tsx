import {
  FilePlus2,
  ImagePlus,
  MailCheck,
  Truck,
  Trophy,
  Printer,
  Clock,
  CircleDot,
} from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import type { AuditLog } from '@/types';

const ACTION_ICONS: Record<string, { icon: typeof CircleDot; className: string }> = {
  REGISTRATION_CREATED: { icon: FilePlus2, className: 'bg-primary-100 text-primary-600 dark:bg-primary-900/40' },
  SCREENSHOT_UPDATED: { icon: ImagePlus, className: 'bg-violet-100 text-violet-600 dark:bg-violet-500/10' },
  VALIDATION_EMAIL_SENT: { icon: MailCheck, className: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10' },
  DISPATCH_ADDED: { icon: Truck, className: 'bg-blue-100 text-blue-600 dark:bg-blue-500/10' },
  REGISTRATION_COMPLETED: { icon: Trophy, className: 'bg-amber-100 text-amber-600 dark:bg-amber-500/10' },
  REGISTRATION_EXPIRED: { icon: Clock, className: 'bg-gray-200 text-gray-500 dark:bg-gray-500/10' },
  PRINT_GENERATED: { icon: Printer, className: 'bg-gray-100 text-gray-500 dark:bg-gray-500/10' },
};

/** Activity timeline built from the registration's audit log. */
export default function Timeline({ logs }: { logs: AuditLog[] }) {
  if (!logs.length) {
    return <p className="py-6 text-center text-sm text-gray-400">No activity recorded yet.</p>;
  }

  return (
    <ol className="relative space-y-5 border-l border-gray-200 pl-6 dark:border-gray-800">
      {logs.map((log) => {
        const cfg = ACTION_ICONS[log.action] ?? {
          icon: CircleDot,
          className: 'bg-gray-100 text-gray-500 dark:bg-gray-500/10',
        };
        const Icon = cfg.icon;
        return (
          <li key={log._id} className="relative">
            <span
              className={`absolute -left-[35px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white dark:ring-gray-900 ${cfg.className}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <p className="text-sm text-gray-800 dark:text-gray-200">{log.message}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {log.user?.name ? `${log.user.name} · ` : ''}
              {formatDateTime(log.createdAt)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
