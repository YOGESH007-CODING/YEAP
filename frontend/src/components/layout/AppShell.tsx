import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { Header } from './Header';
import { Footer } from './Footer';

export function AppShell() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Second gate: user must have a linked LeetCode account before accessing the app
  if (!user?.leetcodeUsername) {
    return <Navigate to="/link-leetcode" replace />;
  }

  return (
    <div className="min-h-screen bg-[#020203] text-[#F3F4F6] flex relative overflow-x-hidden selection:bg-[#5e6ad2] selection:text-[#fdfaff]">
      {/* Ambient background glow */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[400px] bg-[rgba(94,106,210,0.12)] rounded-full blur-[140px] pointer-events-none -z-0" />
      
      <Header />
      
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 z-10">
        <main className="flex-1 min-h-screen pt-14 lg:pt-0">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
