import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import Navbar from './components/ui/Navbar';
import MobileNav from './components/ui/MobileNav';
import LiveLabDock from './components/ui/LiveLabDock';
import { CommandPalette, useCommandShortcut } from './components/ui/CommandPalette';
import Logo from './components/ui/Logo';
import { Spinner } from './components/ui/Primitives';

import HomePage from './pages/HomePage';
import LabsPage from './pages/LabsPage';
import LabDetailPage from './pages/LabDetailPage';
import LeaderboardPage from './pages/LeaderboardPage';
import BadgesPage from './pages/BadgesPage';
import ProfilePage from './pages/ProfilePage';
import PlayerPage from './pages/PlayerPage';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function FullScreenLoader() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-3">
        <Logo compact />
        <Spinner className="h-5 w-5 text-ink-muted" />
      </div>
    </div>
  );
}

function RequireAuth({ children, admin = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (admin && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname]);
  return null;
}

function Footer() {
  return (
    <footer className="mt-10 border-t border-paper-line bg-paper-soft/60">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-3 px-4 py-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Logo compact />
          <span>
            © 2026 PETBUG · แพลตฟอร์มฝึกความปลอดภัยเว็บ
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-mono text-[11px] text-ink-faint">traefik · docker · bullmq · prisma</span>
          <a
            href="/api/health"
            target="_blank"
            rel="noreferrer"
            className="-my-1 inline-flex min-h-[28px] items-center py-1 link-underline"
          >
            สถานะระบบ
          </a>
        </nav>
      </div>
    </footer>
  );
}

function Shell() {
  const { loading } = useAuth();
  const { pathname } = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  useCommandShortcut(() => setPaletteOpen(true));

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const onLabDetail = /^\/labs\/[^/]+$/.test(pathname);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar onOpenPalette={() => setPaletteOpen(true)} />
        <FullScreenLoader />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar onOpenPalette={() => setPaletteOpen(true)} />

      <main
        className={`mx-auto w-full max-w-[1240px] flex-1 px-4 ${isAuthPage ? '' : 'py-5 sm:py-6'} ${
          onLabDetail ? 'pb-[160px] md:pb-32' : 'pb-24 md:pb-10'
        }`}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/labs" element={<LabsPage />} />
          <Route path="/labs/:id" element={<LabDetailPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/badges" element={<BadgesPage />} />
          <Route path="/players/:userId" element={<PlayerPage />} />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth admin>
                <AdminDashboard />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
      <LiveLabDock />
      <MobileNav />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ScrollToTop />
          <Shell />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
