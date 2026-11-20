import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Target, Trophy, Award } from 'lucide-react';
import { api } from '../lib/api';
import { formatDate, pointsLabel, relativeTime, DIFFICULTY } from '../lib/format';
import { Avatar, Card, CardHeader, DifficultyBadge, EmptyState, ProgressRing, Skeleton, Meter } from '../components/ui/Primitives';
import { BadgeMedallion } from '../components/ui/BadgeMedallion';

/** Public player profile: reachable from the leaderboard and lab solver lists. */
export default function PlayerPage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get(`/leaderboard/profile/${userId}`)
      .then((res) => alive && setProfile(res.data))
      .catch((err) => alive && setError(err))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 rounded-panel" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-card" />
          <Skeleton className="h-56 rounded-card" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <Card>
        <EmptyState
          icon={Trophy}
          title="ไม่พบผู้เล่นนี้"
          description={error?.message ?? 'บัญชีอาจถูกลบหรือไอดีไม่ถูกต้อง'}
          action={
            <Link to="/leaderboard" className="btn-primary btn-sm">
              กลับไปตารางอันดับ
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/leaderboard" className="group inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        ตารางอันดับ
      </Link>

      <Card className="overflow-hidden">
        <div className="h-20 bg-[radial-gradient(circle_at_20%_120%,#d5f24a_0%,transparent_45%),radial-gradient(circle_at_90%_-20%,#ece7ff_0%,transparent_50%)]" />
        <div className="-mt-9 flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end">
          <Avatar name={profile.username} size={76} className="ring-4 ring-paper-raised" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold text-ink">{profile.username}</h1>
              {profile.role === 'ADMIN' && <span className="chip chip-plum">ADMIN</span>}
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> เข้าร่วม {formatDate(profile.createdAt)}
              </span>
              {profile.lastLoginAt && <span>เข้าใช้ล่าสุด {relativeTime(profile.lastLoginAt)}</span>}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="num font-display text-2xl font-bold text-ink">{pointsLabel(profile.points)}</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">points</div>
            </div>
            <ProgressRing value={profile.completion} size={62} label={`${profile.completion}%`} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        <Card>
          <CardHeader title={`ด่านที่พิชิตแล้ว (${profile.totalSolves})`} />
          {profile.solves.length === 0 ? (
            <EmptyState icon={Target} title="ยังไม่เคยส่ง flag" description="ผู้เล่นคนนี้ยังไม่ได้ผ่านด่านใด" />
          ) : (
            <ul className="divide-y divide-dashed divide-paper-line">
              {profile.solves.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  <DifficultyBadge difficulty={s.difficulty} showEn={false} />
                  <Link to={`/labs/${s.id}`} className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink hover:underline">
                    {s.title}
                  </Link>
                  <span className="font-mono text-[11px] text-ink-faint">{relativeTime(s.solvedAt)}</span>
                  <span className="num w-12 text-right font-mono text-[12px] font-semibold text-moss">+{s.points}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <aside className="space-y-4">
          <Card>
            <CardHeader title={profile.rank ? `อันดับ #${profile.rank}` : 'ยังไม่มีอันดับ'} />
            <div className="space-y-2.5 p-4 text-[13px]">
              {Object.entries(profile.byDifficulty).map(([key, count]) => (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-ink-muted">{DIFFICULTY[key]?.label ?? key}</span>
                    <span className="num font-mono text-xs text-ink">{count}</span>
                  </div>
                  <Meter
                    value={profile.totalSolves ? (count / profile.totalSolves) * 100 : 0}
                    tone={key === 'EASY' ? 'moss' : key === 'MEDIUM' ? 'ember' : 'plum'}
                  />
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-paper-line pt-2 text-xs text-ink-muted">
                <span>ผู้เล่นทั้งหมด</span>
                <span className="num font-mono text-ink">{profile.totalPlayers}</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title={`เหรียญ (${profile.badges.length})`} />
            {profile.badges.length === 0 ? (
              <div className="p-4 text-center text-xs text-ink-faint">
                <Award className="mx-auto mb-1 h-5 w-5 opacity-40" />
                ยังไม่มีเหรียญ
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 p-4">
                {profile.badges.map((b) => (
                  <BadgeMedallion key={b.id} badge={b} size="md" />
                ))}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
