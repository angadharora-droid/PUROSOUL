import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import EmptyState from '@/components/ui/EmptyState';
import type { Role } from '@/types';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}

export function RoleRoute({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return (
      <div className="card">
        <EmptyState
          icon={<ShieldAlert className="h-7 w-7" />}
          title="Access denied"
          description="You do not have permission to view this page. Contact your administrator if you believe this is a mistake."
        />
      </div>
    );
  }

  return <>{children}</>;
}
