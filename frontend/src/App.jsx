import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import Navbar from './components/ui/Navbar';
import MobileNav from './components/ui/MobileNav';
import LiveLabDock from './components/ui/LiveLabDock';
import { CommandPalette, useCommandShortcut } from './components/ui/CommandPalette';
import Logo from './components/ui/Logo';
import { Spinner } from './components/ui/Primitives';
import { BRAND } from './config/brand';

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
    // Use the simple overload: some mobile browsers reject the non-standard
    // `instant` behavior and leave the page in an inconsistent scroll state.
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Footer() {
  const { user, isAdmin } = useAuth();
  const year = new Date().getFullYear();
  // Ink-based colours: the footer sits on the light paper surface, so a faint
  // grey-on-white link would fall below readable contrast.
  const link = 'w-fit rounded-sm text-[13px] text-ink-soft transition-colors hover:text-ink hover:underline underline-offset-2';

  return (
    <footer className="mt-12 border-t border-paper-line bg-paper-soft/70">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          {/* brand */}
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <Logo size={32} />
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
              ห้องแล็บฝึกความปลอดภัยเว็บ ที่ทุกด่านรันในคอนเทนเนอร์แยกเฉพาะคุณ — ใช้เพื่อการเรียนรู้อย่างรับผิดชอบเท่านั้น
            </p>
          </div>

          {/* explore */}
          <nav aria-label="เมนูท้ายหน้า: สำรวจ" className="grid content-start gap-2.5">
            <p className="eyebrow">สำรวจ</p>
            <Link to="/labs" className={link}>ด่านทดสอบ</Link>
            <Link to="/leaderboard" className={link}>ตารางอันดับ</Link>
            <Link to="/badges" className={link}>เหรียญรางวัล</Link>
          </nav>

          {/* account */}
          <nav aria-label="เมนูท้ายหน้า: บัญชี" className="grid content-start gap-2.5">
            <p className="eyebrow">บัญชี</p>
            {user ? (
              <>
                <Link to="/profile" className={link}>โปรไฟล์ของฉัน</Link>
                <Link to="/profile?tab=settings" className={link}>ตั้งค่าบัญชี</Link>
                {isAdmin && <Link to="/admin" className={link}>แผงควบคุม</Link>}
              </>
            ) : (
              <>
                <Link to="/login" className={link}>เข้าสู่ระบบ</Link>
                <Link to="/register" className={link}>สร้างบัญชีฟรี</Link>
                <Link to="/labs" className={link}>ดูด่านทั้งหมด</Link>
              </>
            )}
          </nav>

          {/* system + contact */}
          <div className="grid content-start gap-2.5">
            <p className="eyebrow">ระบบและติดต่อ</p>
            <a
              href="/api/health"
              target="_blank"
              rel="noreferrer"
              className={`${link} -my-1 inline-flex min-h-[28px] items-center py-1`}
            >
              สถานะระบบ
              <span className="ml-1.5 font-mono text-[10px] text-ink-faint">↗</span>
            </a>
            <a href="mailto:tanawat29664@gmail.com" className={link}>tanawat29664@gmail.com</a>
            <p className="text-[12px] leading-relaxed text-ink-faint">
              แจ้งปัญหาด่านหรือขอสิทธิ์ผู้ดูแลระบบผ่านอีเมลนี้
            </p>
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-2 border-t border-paper-line pt-5 text-[11px] text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {BRAND.name} — พัฒนาเพื่อการศึกษา ·{' '}
            <span className="text-ink-muted">ห้ามโจมตีระบบนอกขอบเขตห้องแล็บ</span>
          </p>
          <p className="text-[11px] text-ink-faint">Traefik · Docker · BullMQ · Prisma</p>
        </div>
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
