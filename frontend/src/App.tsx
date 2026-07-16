import { useState, useCallback, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './lib/auth';
import type { AuthUser } from './lib/auth';
import { api } from './lib/api';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReviewPage } from './pages/ReviewPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';

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
    await api.post('/api/auth/logout').catch(() => {});
    api.setAccessToken(null);
    setToken(null);
    setUser(null);
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
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/review/:slug" element={<ReviewPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
