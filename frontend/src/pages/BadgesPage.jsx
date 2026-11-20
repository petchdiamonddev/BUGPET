import React, { useEffect, useMemo, useState } from 'react';
import { Award, Lock, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { cn, relativeTime, formatDate } from '../lib/format';import { BadgeMedallion } from '../components/ui/BadgeMedallion';
import { Card, EmptyState, Skeleton, TierBadge, Meter } from '../components/ui/Primitives';

const TIER_ORDER = { BRONZE: 0, SILVER: 1, GOLD: 2 };

export function BadgeCard({ badge, earned, earnedAt }) {
  return (
    <div
      className={cn(
        'group relative flex flex-col gap-2 rounded-card border p-3 transition-all',
        earned ? 'border-paper-line bg-white hover:border-ink-faint' : 'border-dashed border-paper-strong bg-paper-soft/50'
      )}
    >
      <div className="flex items-start justify-between">
        <BadgeMedallion badge={badge} earned={earned} size="md" />
        <TierBadge tier={badge.tier} />
      </div>
      <div>
        <p className={cn('text-[13px] font-semibold leading-snug', earned ? 'text-ink' : 'text-ink-muted')}>{badge.name}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">{badge.description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-paper-line/70 pt-2">
        {earned ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-moss">
            <Sparkles className="h-3 w-3" />
            ได้รับ {earnedAt ? relativeTime(earnedAt) : ''}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-ink-faint">
            <Lock className="h-3 w-3" />
            ยังไม่ปลดล็อก
          </span>
        )}
        {badge.points > 0 && <span className="font-mono text-[10px] text-ink-faint">+{badge.points}p</span>}
      </div>
    </div>
  );
}

export default function BadgesPage() {
  const { user } = useAuth();
  const [badges, setBadges] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [badgeRes, profileRes] = await Promise.all([
          api.get('/leaderboard/badges'),
          user ? api.get('/leaderboard/me') : Promise.resolve({ data: null }),
        ]);
        if (!alive) return;
        setBadges(badgeRes.data ?? []);
        setProfile(profileRes.data ?? null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const earnedMap = useMemo(() => new Map((profile?.badges ?? []).map((b) => [b.id, b.earnedAt])), [profile]);
  const sorted = useMemo(
    () => [...badges].sort((a, b) => (TIER_ORDER[a.tier] ?? 0) - (TIER_ORDER[b.tier] ?? 0) || a.id - b.id),
    [badges]
  );
  const owned = profile?.badges?.length ?? 0;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">เหรียญรางวัล</h1>
          <p className="mt-0.5 text-[13px] text-ink-muted">เก็บเหรียญจากการพิชิตด่าน และรับคะแนนโบนัสเพิ่มเมื่อปลดล็อก</p>
        </div>
        {user && (
          <div className="w-full max-w-[240px] rounded-card border border-paper-line bg-paper-raised p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-muted">ปลดล็อกแล้ว</span>
              <span className="num font-mono font-semibold text-ink">
                {owned} / {badges.length}
              </span>
            </div>
            <Meter className="mt-1.5" value={badges.length ? (owned / badges.length) * 100 : 0} tone="acid" />
          </div>
        )}
      </header>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[132px] rounded-card" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <EmptyState icon={Award} title="ยังไม่มีเหรียญในระบบ" description="ผู้ดูแลระบบยังไม่ได้ตั้งค่าเหรียญ" />
        </Card>
      ) : (
        Object.keys(TIER_ORDER).map((tier) => {
          const group = sorted.filter((b) => (b.tier ?? 'BRONZE') === tier);
          if (!group.length) return null;
          return (
            <section key={tier}>
              <div className="mb-2 flex items-center gap-2">
                <TierBadge tier={tier} />
                <span className="h-px flex-1 bg-paper-line" />
                <span className="font-mono text-[10px] text-ink-faint">
                  {group.filter((b) => earnedMap.has(b.id)).length}/{group.length}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {group.map((b) => {
                  const earned = earnedMap.has(b.id);
                  return <BadgeCard key={b.id} badge={b} earned={earned} earnedAt={earnedMap.get(b.id)} />;
                })}
              </div>
            </section>
          );
        })
      )}

      {profile?.badges?.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 text-[13px] font-semibold text-ink">ไทม์ไลน์เหรียญของคุณ</h2>
          <ol className="relative space-y-3 border-l border-paper-line pl-4">
            {profile.badges.map((b) => (
              <li key={b.id} className="relative">
                <span className="absolute -left-[22px] top-1.5 h-2 w-2 rounded-full bg-moss ring-4 ring-paper-raised" />
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-ink">{b.name}</span>
                  <span className="font-mono text-[10px] text-ink-faint">{formatDate(b.earnedAt)}</span>
                </div>
                <p className="text-[11px] text-ink-muted">{b.description}</p>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
