import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Crown, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { cn, pointsLabel } from '../lib/format';
import LeaderboardRow, { RankBadge } from '../components/ui/LeaderboardRow';
import { Avatar, Card, EmptyState, Segmented, Skeleton } from '../components/ui/Primitives';
import { BadgeMedallion } from '../components/ui/BadgeMedallion';

function PodiumCard({ entry, place, isMe }) {
  const heights = { 1: 'sm:mt-0', 2: 'sm:mt-5', 3: 'sm:mt-9' };
  const accent = { 1: 'border-acid-deep/50 bg-acid/15', 2: 'border-paper-strong bg-paper-raised', 3: 'border-[#d9b68f] bg-[#f7ecdf]/60' };
  return (
    <Link
      to={`/players/${entry.id}`}
      className={cn(
        'relative flex flex-col items-center gap-1 rounded-card border px-3 py-4 transition-colors hover:border-ink-faint',
        accent[place],
        heights[place],
        isMe && 'ring-1 ring-ink'
      )}
    >
      {place === 1 && <Crown className="absolute -top-3 h-5 w-5 text-[#b8940a]" />}
      <div className="relative">
        <Avatar name={entry.username} size={place === 1 ? 52 : 42} ring />
        <span className="absolute -bottom-1 -right-1">
          <RankBadge rank={place} className="h-5 w-5 rounded-md text-[9px]" />
        </span>
      </div>
      <span className="mt-1.5 max-w-full truncate text-sm font-semibold text-ink">{entry.username}</span>
      <span className="num font-mono text-[13px] font-semibold text-ink-soft">{pointsLabel(entry.points)} pts</span>
      <span className="font-mono text-[10px] text-ink-faint">{entry.solvesCount} solves</span>
      {entry.badges?.length > 0 && (
        <div className="mt-1 flex -space-x-1">
          {entry.badges.slice(0, 3).map((b) => (
            <BadgeMedallion key={b.id} badge={b} size="sm" className="h-5 w-5 rounded-md ring-2 ring-paper-raised" />
          ))}
        </div>
      )}
    </Link>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('all');
  const [entries, setEntries] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get(`/leaderboard?limit=100&period=${period}`)
      .then((res) => {
        if (!alive) return;
        setEntries(res.data ?? []);
        setMeta(res.meta ?? null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [period]);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const myEntry = entries.find((e) => e.id === user?.id);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">ตารางอันดับ</h1>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            {period === 'week' ? 'คะแนนที่ทำได้ใน 7 วันที่ผ่านมา' : 'คะแนนสะสมทั้งหมดจากด่านที่พิชิต'}
          </p>
        </div>
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'all', label: 'ตลอดกาล' },
            { value: 'week', label: '7 วันล่าสุด' },
          ]}
        />
      </header>

      {user && myEntry && (
        <Card className="flex items-center gap-3 border-ink/15 bg-acid/10 px-4 py-2.5">
          <RankBadge rank={myEntry.rank} />
          <Avatar name={user.username} size={28} />
          <span className="flex-1 text-sm font-semibold text-ink">
            {user.username} <span className="font-normal text-ink-muted">· อันดับของคุณ</span>
          </span>
          <span className="num font-mono text-sm font-semibold text-ink">{pointsLabel(myEntry.points)} pts</span>
          <Link to="/profile" className="text-xs font-medium text-ink-soft hover:text-ink">
            โปรไฟล์
          </Link>
        </Card>
      )}

      {loading ? (
        <Card className="divide-y divide-dashed divide-paper-line">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-4 w-14" />
            </div>
          ))}
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <EmptyState
            icon={Trophy}
            title="ยังไม่มีผู้เล่นในตารางนี้"
            description="ต้องส่ง flag อย่างน้อย 1 ด่านก่อนจึงจะขึ้นตาราง"
            action={
              <Link to="/labs" className="btn-primary btn-sm">
                ไปทำด่านแรก
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[1, 2, 0].map((idx) => {
              const entry = top3[idx];
              if (!entry) return <div key={idx} />;
              return <PodiumCard key={entry.id} entry={entry} place={entry.rank} isMe={entry.id === user?.id} />;
            })}
          </div>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-paper-line px-4 py-2.5">
              <h2 className="text-[13px] font-semibold text-ink">
                อันดับ 4 เป็นต้นไป <span className="font-normal text-ink-muted">({Math.max(0, entries.length - 3)} คน)</span>
              </h2>
              <span className="font-mono text-[11px] text-ink-faint">{meta?.total ?? entries.length} players</span>
            </div>
            <div className="divide-y divide-dashed divide-paper-line">
              {rest.map((entry) => (
                <LeaderboardRow key={entry.id} entry={entry} isMe={entry.id === user?.id} />
              ))}
              {rest.length === 0 && <p className="px-4 py-6 text-center text-xs text-ink-faint">ยังไม่มีผู้เล่นเพิ่มเติม</p>}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
