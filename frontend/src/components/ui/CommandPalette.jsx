import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  CornerDownLeft,
  BookOpen,
  Trophy,
  Award,
  User as UserIcon,
  ShieldCheck,
  Home,
  ArrowUpRight,
  Hash,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { cn, DIFFICULTY } from '../../lib/format';
import { DifficultyBadge, Spinner } from './Primitives';

const PAGES = [
  { label: 'หน้าหลัก', to: '/', icon: Home, keywords: 'home' },
  { label: 'ด่านทดสอบทั้งหมด', to: '/labs', icon: BookOpen, keywords: 'labs challenges' },
  { label: 'ตารางอันดับ', to: '/leaderboard', icon: Trophy, keywords: 'leaderboard rank' },
  { label: 'เหรียญรางวัล', to: '/badges', icon: Award, keywords: 'badges achievement' },
  { label: 'โปรไฟล์ของฉัน', to: '/profile', icon: UserIcon, keywords: 'profile me' },
  { label: 'แผงควบคุมผู้ดูแล', to: '/admin', icon: ShieldCheck, keywords: 'admin', adminOnly: true },
];

/**
 * Cmd/Ctrl+K command palette: jump to pages, labs (live search against the
 * API) and players. Keyboard-first: ↑ ↓ to move, Enter to open, Esc to close.
 */
export function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ labs: [], players: [] });
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Live search, debounced.
  useEffect(() => {
    if (!open) return undefined;
    if (query.trim().length < 2) {
      setResults({ labs: [], players: [] });
      return undefined;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const [labsRes, playersRes] = await Promise.allSettled([
          api.get(`/labs?search=${encodeURIComponent(query.trim())}`),
          api.get('/leaderboard?limit=100'),
        ]);
        const labs = labsRes.status === 'fulfilled' ? (labsRes.value.data ?? []).slice(0, 5) : [];
        const players =
          playersRes.status === 'fulfilled'
            ? (playersRes.value.data ?? [])
                .filter((p) => p.username.toLowerCase().includes(query.trim().toLowerCase()))
                .slice(0, 4)
            : [];
        setResults({ labs, players });
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults({ labs: [], players: [] });
    setActiveIndex(0);
    setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pages = PAGES.filter((p) => !p.adminOnly || isAdmin).filter(
      (p) => !q || p.label.toLowerCase().includes(q) || p.keywords.includes(q)
    );
    return [
      ...pages.map((p) => ({ type: 'page', id: `page-${p.to}`, ...p })),
      ...results.labs.map((l) => ({ type: 'lab', id: `lab-${l.id}`, label: l.title, to: `/labs/${l.id}`, lab: l })),
      ...results.players.map((p) => ({
        type: 'player',
        id: `player-${p.id}`,
        label: p.username,
        to: `/players/${p.id}`,
        player: p,
      })),
    ];
  }, [query, results, isAdmin]);

  useEffect(() => setActiveIndex(0), [items.length, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (items.length ? (i + 1) % items.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
      } else if (e.key === 'Enter') {
        const item = items[activeIndex];
        if (item) {
          e.preventDefault();
          navigate(item.to);
          onClose();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, items, activeIndex, navigate, onClose]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  const groupLabel = (type) => ({ page: 'ไปที่หน้า', lab: 'ด่านทดสอบ', player: 'ผู้เล่น' })[type];
  let lastType = null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 animate-fade-in bg-ink/35 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-xl animate-pop-in overflow-hidden rounded-panel border border-paper-line bg-paper-raised shadow-lift">
        <div className="flex items-center gap-3 border-b border-paper-line px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาด่าน, ผู้เล่น, หน้า…"
            className="h-12 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
            aria-label="ค้นหาด่วน"
          />
          {loading ? <Spinner className="h-4 w-4 text-ink-faint" /> : <kbd className="kbd">esc</kbd>}
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-muted">
              {query.length >= 2 ? 'ไม่พบผลลัพธ์ที่ตรงกับคำค้น' : 'พิมพ์เพื่อค้นหา หรือเลือกจากเมนูด้านบน'}
            </p>
          ) : (
            items.map((item, idx) => {
              const header = item.type !== lastType ? groupLabel(item.type) : null;
              lastType = item.type;
              const Icon = item.icon;
              return (
                <React.Fragment key={item.id}>
                  {header && <div className="eyebrow px-3 pb-1 pt-2.5">{header}</div>}
                  <button
                    data-active={idx === activeIndex}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => {
                      navigate(item.to);
                      onClose();
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                      idx === activeIndex ? 'bg-ink text-paper-raised' : 'text-ink-soft hover:bg-paper-soft'
                    )}
                  >
                    {item.type === 'page' && <Icon className="h-4 w-4 shrink-0 opacity-70" />}
                    {item.type === 'lab' && (
                      <span
                        className={cn(
                          'h-1.5 w-1.5 shrink-0 rounded-full',
                          { EASY: 'bg-moss', MEDIUM: 'bg-ember', HARD: 'bg-plum' }[item.lab.difficulty]
                        )}
                      />
                    )}
                    {item.type === 'player' && (
                      <span className={cn('font-mono text-2xs', idx === activeIndex ? 'opacity-60' : 'text-ink-faint')}>
                        #{item.player.rank}
                      </span>
                    )}

                    <span className="flex-1 truncate text-[13px] font-medium">{item.label}</span>

                    {item.type === 'lab' && (
                      <span className={cn('num font-mono text-2xs', idx === activeIndex ? 'opacity-70' : 'text-ink-faint')}>
                        {DIFFICULTY[item.lab.difficulty]?.label} · {item.lab.points}p
                      </span>
                    )}
                    {item.type === 'page' && <CornerDownLeft className="h-3.5 w-3.5 opacity-40" />}
                    {item.type === 'player' && <ArrowUpRight className="h-3.5 w-3.5 opacity-40" />}
                  </button>
                </React.Fragment>
              );
            })
          )}
          {query.trim().length >= 2 && !loading && results.labs.length === 0 && results.players.length === 0 && (
            <div className="px-3 py-3">
              <p className="text-xs text-ink-faint">
                ยังไม่มีด่านที่ตรงกัน — ลองค้นด้วยแท็กอย่าง <span className="font-mono">SQLi</span> หรือ{' '}
                <span className="font-mono">XSS</span>
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-paper-line bg-paper-soft/60 px-4 py-2 text-2xs text-ink-muted">
          <span className="flex items-center gap-2">
            <kbd className="kbd">↑</kbd>
            <kbd className="kbd">↓</kbd> เลื่อน
            <kbd className="kbd">↵</kbd> เปิด
          </span>
          <span className="font-mono">{user ? user.username : 'guest'}</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Registers the global ⌘K / Ctrl+K listener. */
export function useCommandShortcut(onOpen) {
  const handle = useCallback(
    (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpen();
      }
    },
    [onOpen]
  );
  useEffect(() => {
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [handle]);
}

export { Hash };
