import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  FilePlus2,
  ClipboardList,
  Settings,
  X,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/schemes', label: 'Scheme Master', icon: Layers, roles: ['admin'] },
  { to: '/registrations/new', label: 'New Registration', icon: FilePlus2, roles: ['sales', 'admin'] },
  { to: '/registrations', label: 'Registrations', icon: ClipboardList, end: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();

  const items = NAV_ITEMS.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 z-30 bg-gray-950/50 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform dark:border-gray-800 dark:bg-gray-900 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
          <Logo />
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-200 p-4 text-xs text-gray-400 dark:border-gray-800">
          © {new Date().getFullYear()} Puro Soul
          <span className="block text-[10px]">Amarjit Fiscal Ventures Pvt. Ltd.</span>
        </div>
      </aside>
    </>
  );
}
