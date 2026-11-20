import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, Command, BookOpen, Trophy, Award, User as UserIcon, ShieldCheck, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn, pointsLabel } from '../../lib/format';
import { BRAND } from '../../config/brand';
import Logo from './Logo';
import { Avatar, StatusDot } from './Primitives';

const NAV = [
  { to: '/labs', label: 'ด่านทดสอบ', icon: BookOpen },
  { to: '/leaderboard', label: 'อันดับ', icon: Trophy },
  { to: '/badges', label: 'เหรียญ', icon: Award },
];

export function CommandTrigger({ onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex h-9 w-full items-center gap-2 rounded-xl border border-paper-strong bg-paper-soft/70 px-3 text-left text-sm text-ink-faint transition-all hover:border-ink-faint hover:bg-paper-raised hover:text-ink-muted',
        className
      )}
      aria-label="ค้นหาด่วน"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">ค้นหาด่าน, ผู้เล่น…</span>
      <span className="hidden items-center gap-1 sm:flex">
        <kbd className="kbd">
          <Command className="h-2.5 w-2.5" />
        </kbd>
        <kbd className="kbd">K</kbd>
      </span>
    </button>
  );
}

function AvatarMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-transparent p-0.5 pr-2 transition-colors hover:border-paper-strong hover:bg-paper-soft"
        aria-expanded={open}
        aria-label="เมนูบัญชี"
      >
        <Avatar name={user.username} size={30} />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-[9rem] truncate text-[13px] font-semibold text-ink">{user.username}</span>
          <span className="num block font-mono text-[10px] text-ink-muted">{pointsLabel(user.points)} pts</span>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 animate-pop-in overflow-hidden rounded-xl border border-paper-line bg-paper-raised shadow-lift">
          <div className="flex items-center gap-3 border-b border-paper-line p-3">
            <Avatar name={user.username} size={38} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user.username}</p>
              <p className="truncate text-2xs text-ink-muted">{user.email}</p>
            </div>
          </div>
          <div className="p-1">
            {[
              { to: '/profile', label: 'โปรไฟล์ของฉัน', icon: UserIcon },
              { to: '/profile?tab=settings', label: 'ตั้งค่าบัญชี', icon: Settings },
              ...(user.role === 'ADMIN' ? [{ to: '/admin', label: 'แผงควบคุมผู้ดูแล', icon: ShieldCheck }] : []),
            ].map(({ to, label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => {
                  setOpen(false);
                  navigate(to);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ink-soft transition-colors hover:bg-paper-soft hover:text-ink"
              >
                <Icon className="h-4 w-4 text-ink-faint" />
                {label}
              </button>
            ))}
          </div>
          <div className="border-t border-paper-line p-1">
            <button
              onClick={async () => {
                setOpen(false);
                await logout();
                navigate('/');
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-ember-deep transition-colors hover:bg-ember-soft"
            >
              <LogOut className="h-4 w-4" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar({ onOpenPalette }) {
  const { user, activeInstance } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-paper-line bg-white">
      <div className="mx-auto flex h-14 w-full max-w-[1240px] items-center gap-3 px-4 sm:gap-5">
        <Link to="/" className="shrink-0" aria-label={`${BRAND.name} หน้าหลัก`}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                  isActive ? 'text-ink' : 'text-ink-muted hover:bg-paper-soft hover:text-ink'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-4 w-4" strokeWidth={2} />
                  {label}
                  {isActive && <span className="absolute inset-x-2.5 -bottom-[11px] h-[2px] bg-acid" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <CommandTrigger onClick={onOpenPalette} className="hidden w-56 lg:flex xl:w-64" />
          <button
            onClick={onOpenPalette}
            className="grid h-9 w-9 place-items-center rounded-xl border border-paper-strong bg-paper-soft text-ink-muted transition-colors hover:text-ink lg:hidden"
            aria-label="ค้นหา"
          >
            <Search className="h-4 w-4" />
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              {activeInstance && (
                <span className="hidden items-center gap-1.5 rounded-full border border-moss/25 bg-moss-soft px-2.5 py-1 font-mono text-2xs font-medium text-moss-deep sm:flex">
                  <StatusDot tone="moss" pulse />
                  lab live
                </span>
              )}
              <AvatarMenu />
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link to="/login" className="btn-ghost btn-sm">
                เข้าสู่ระบบ
              </Link>
              <Link to="/register" className="btn-primary btn-sm">
                สมัครฟรี
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
