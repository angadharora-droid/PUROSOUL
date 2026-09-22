import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchMe, login as apiLogin, ssoLogin as apiSsoLogin } from '@/api/auth';
import { resolveSsoToken, ssoLogout } from '@/lib/sso';
import type { Role, User } from '@/types';

/**
 * Central sign-on: with no local session, the portal cookie may still identify
 * this visitor. Exchanges the portal's hand-off token for a normal session and
 * stores it exactly as login() does. Resolves to the user, or null when SSO is
 * off, the visitor is not signed in to the portal, or no account is linked.
 */
async function restoreFromSso(): Promise<User | null> {
  const ssoToken = await resolveSsoToken();
  if (!ssoToken) return null;
  try {
    const { token, user } = await apiSsoLogin(ssoToken);
    localStorage.setItem('token', token);
    return user;
  } catch {
    return null;
  }
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      // No local session: try the portal before showing the login page.
      // `loading` stays true meanwhile so ProtectedRoute keeps its spinner.
      restoreFromSso()
        .then((ssoUser) => {
          if (ssoUser) setUser(ssoUser);
        })
        .finally(() => setLoading(false));
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const { token, user: loggedIn } = await apiLogin(identifier, password);
    localStorage.setItem('token', token);
    setUser(loggedIn);
  }, []);

  const logout = useCallback(() => {
    void ssoLogout(); // end the portal session too, or the next load signs back in
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const hasRole = useCallback((...roles: Role[]) => (user ? roles.includes(user.role) : false), [user]);

  const value = useMemo(() => ({ user, loading, login, logout, hasRole }), [user, loading, login, logout, hasRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
