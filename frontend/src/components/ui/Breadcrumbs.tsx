import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
      <Link to="/" className="flex items-center gap-1 transition hover:text-primary-600">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
          {item.to ? (
            <Link to={item.to} className="transition hover:text-primary-600">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-gray-900 dark:text-white">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
