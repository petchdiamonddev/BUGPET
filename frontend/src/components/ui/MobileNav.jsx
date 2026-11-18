import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Trophy, Award, Home, User as UserIcon } from 'lucide-react';
import { cn } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';

const ITEMS = [
  { to: '/', label: 'หน้าหลัก', icon: Home, match: (p) => p === '/' },
  { to: '/labs', label: 'ด่าน', icon: BookOpen, match: (p) => p.startsWith('/labs') },
  { to: '/leaderboard', label: 'อันดับ', icon: Trophy, match: (p) => p.startsWith('/leaderboard') },
  { to: '/badges', label: 'เหรียญ', icon: Award, match: (p) => p.startsWith('/badges') },
  { to: '/profile', label: 'ฉัน', icon: UserIcon, match: (p) => p.startsWith('/profile') },
];

/** Bottom tab bar for small screens (thumb-reachable primary nav). */
export default function MobileNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const items = user ? ITEMS : ITEMS.filter((i) => i.to !== '/profile').concat({ ...ITEMS[4], to: '/login', label: 'เข้าสู่ระบบ' });

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-paper-line bg-paper/95 backdrop-blur-md md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
                active ? 'text-ink' : 'text-ink-faint'
              )}
            >
              <span className={cn('grid h-7 w-9 place-items-center rounded-lg transition-colors', active && 'bg-ink text-paper-raised')}>
                <Icon className="h-4 w-4" strokeWidth={2.1} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
