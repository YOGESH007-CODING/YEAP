import { useState, useCallback, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { AuthContext } from './lib/auth';
import type { AuthUser } from './lib/auth';
import { api } from './lib/api';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReviewPage } from './pages/ReviewPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void api.refresh().then((session) => { setToken(session.accessToken); setUser(session.user); }).catch(() => {}).finally(() => setReady(true));
  }, []);

  const signIn = useCallback((session: { accessToken: string; user: AuthUser }) => {
    api.setAccessToken(session.accessToken);
    setToken(session.accessToken);
    setUser(session.user);
  }, []);

  const signOut = useCallback(async () => {
    api.setAccessToken(null);
    setToken(null);
    setUser(null);
    await api.post('/api/auth/logout').catch(() => {});
  }, []);

  const authValue = useMemo(() => ({
    user,
    token,
    signIn,
    signOut,
    isAuthenticated: !!token,
  }), [user, token, signIn, signOut]);

  if (!ready) return null;

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
          <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
          <Route path="/oauth-callback" element={<OAuthCallbackPage />} />

          {/* Protected routes — AppShell handles auth guard */}
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/review/:slug" element={<ReviewPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all: authenticated → dashboard, public → home */}
          <Route path="*" element={<Navigate to={token ? '/dashboard' : '/'} replace />} />
        </Routes>
        <Analytics />
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
