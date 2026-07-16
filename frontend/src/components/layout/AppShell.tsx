import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { Header } from './Header';
import { Footer } from './Footer';

export function AppShell() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
