import { Route, Routes } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { ProtectedRoute, RoleRoute } from '@/components/routes/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import SchemesPage from '@/pages/SchemesPage';
import NewRegistrationPage from '@/pages/NewRegistrationPage';
import RegistrationsPage from '@/pages/RegistrationsPage';
import RegistrationDetailPage from '@/pages/RegistrationDetailPage';
import PrintReportPage from '@/pages/PrintReportPage';
import SettingsPage from '@/pages/SettingsPage';
import NotFoundPage from '@/pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        {/* Standalone print view (no app chrome, A4-ready) */}
        <Route path="/print/:id" element={<PrintReportPage />} />

        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route
            path="/schemes"
            element={
              <RoleRoute roles={['admin']}>
                <SchemesPage />
              </RoleRoute>
            }
          />
          <Route
            path="/registrations/new"
            element={
              <RoleRoute roles={['sales', 'admin']}>
                <NewRegistrationPage />
              </RoleRoute>
            }
          />
          <Route path="/registrations" element={<RegistrationsPage />} />
          <Route path="/registrations/:id" element={<RegistrationDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
