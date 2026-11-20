import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Activity, Trophy, BookOpen, Compass } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLabSession } from '../hooks/useLabSession';
import { cn, relativeTime, pointsLabel } from '../lib/format';
import Hero from '../components/ui/Hero';
import LabCard from '../components/ui/LabCard';
import LeaderboardRow from '../components/ui/LeaderboardRow';
import { BadgeMedallion } from '../components/ui/BadgeMedallion';
import { Card, CardHeader, ProgressRing, Skeleton, EmptyState, Button } from '../components/ui/Primitives';

function ActivityItem({ event }) {
  const isSolve = event.type === 'solve';
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span
        className={cn(
          'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded',
          isSolve ? 'bg-moss-soft text-moss-deep' : 'bg-paper-soft text-ink-soft'
        )}
      >
        {isSolve ? <Trophy className="h-3.5 w-3.5" /> : <span className="text-[10px] font-semibold">B</span>}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-ink-soft">
          <span className="font-semibold text-ink">{event.username}</span>{' '}
          {isSolve ? (
            <>
              เจาะ <Link to={`/labs/${event.labId}`} className="font-medium text-ink underline decoration-paper-strong underline-offset-2 hover:decoration-ink">{event.title}</Link> สำเร็จ
            </>
          ) : (
            <>ได้รับเหรียญ <span className="font-medium text-ink">{event.title}</span></>
          )}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-ink-faint">
          {relativeTime(event.at)}
          {isSolve && (
            <>
              <span>·</span>
              <span>+{event.points}p</span>
            </>
          )}
        </p>
      </div>
    </li>
  );
}

function ProgressTerminal({ progress, isStarting }) {
  const pct = Math.round(progress);
  return (
    <div className="text-center">
      {isStarting ? (
        <span className="text-[11px] text-ink-muted">กำลังเปิด</span>
      ) : (
        <>
          <span className="num block text-[15px] font-semibold text-ink">{pct}%</span>
          <div className="mx-auto mt-1 h-[3px] w-8 overflow-hidden bg-paper-line">
            <div className="h-full bg-acid transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
          </div>
        </>
      )}
    </div>
  );
}

function ContinueCard() {
  const { activeInstance, remainingMs, progress, isStarting } = useLabSession();
  const { pathname } = useLocation();
  if (!activeInstance || pathname.startsWith('/labs/')) return null;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-paper-line bg-paper-soft px-4 py-2.5">
        <span className="text-xs font-medium text-ink-soft">ด่านที่เปิดอยู่</span>
        <span className="num text-xs text-ink-muted">
          {isStarting ? 'กำลังเตรียม' : `เหลือประมาณ ${Math.max(1, Math.round(remainingMs / 60000))} นาที`}
        </span>
      </div>
      <div className="flex items-center gap-4 p-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center border border-paper-line bg-paper-soft">
          <ProgressTerminal progress={progress} isStarting={isStarting} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink">{activeInstance.labTitle}</p>
          <p className="truncate font-mono text-[11px] text-ink-muted">{activeInstance.url}</p>
        </div>
        <a href={activeInstance.url} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm">
          เปิดด่าน
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </Card>
  );
}

export default function HomePage() {
  const { user, activeInstance } = useAuth();
  const [labs, setLabs] = useState([]);
  const [labsLoading, setLabsLoading] = useState(true);
  const [leaders, setLeaders] = useState([]);
  const [activity, setActivity] = useState([]);
  const [badges, setBadges] = useState([]);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [labsRes, leadersRes, activityRes, badgesRes, statsRes, profileRes] = await Promise.allSettled([
        api.get('/labs'),
        api.get('/leaderboard?limit=5'),
        api.get('/leaderboard/activity?limit=6'),
        api.get('/leaderboard/badges'),
        api.get('/leaderboard/stats'),
        user ? api.get('/leaderboard/me') : Promise.resolve(null),
      ]);
      if (!alive) return;

      if (labsRes.status === 'fulfilled') setLabs(labsRes.value.data ?? []);
      if (leadersRes.status === 'fulfilled') setLeaders(leadersRes.value.data ?? []);
      if (activityRes.status === 'fulfilled') setActivity(activityRes.value.data ?? []);
      if (badgesRes.status === 'fulfilled') setBadges(badgesRes.value.data ?? []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data ?? null);
      if (profileRes.status === 'fulfilled' && profileRes.value) setProfile(profileRes.value.data);
      setLabsLoading(false);
      setStatsLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  // Next-up: first unsolved lab by difficulty, else newest.
  const order = { EASY: 0, MEDIUM: 1, HARD: 2 };
  const ranked = [...labs].sort((a, b) => order[a.difficulty] - order[b.difficulty] || a.points - b.points);
  const nextUp = ranked.find((l) => !l.isSolved) ?? ranked[0];
  const featured = ranked.filter((l) => !l.isSolved).slice(0, 3);
  const showcase = (featured.length ? featured : ranked).slice(0, 3);

  return (
    <div className="space-y-6">
      <Hero stats={stats} statsLoading={statsLoading} />

      {user && <ContinueCard />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ------------------------------ main column ----------------------------- */}
        <div className="min-w-0 space-y-6">
          <section>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">
                  {user ? 'ด่านถัดไปสำหรับคุณ' : 'ด่านยอดนิยม'}
                </h2>
                <p className="text-[13px] text-ink-muted">คัดตามระดับความยาก เริ่มจากง่ายก่อน</p>
              </div>
              <Link
                to="/labs"
                className="group -my-2 inline-flex min-h-[36px] items-center gap-1 px-1 text-[13px] font-medium text-ink-soft hover:text-ink"
              >
                ทั้งหมด
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {labsLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="card h-[196px] p-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="mt-3 h-5 w-3/4" />
                    <Skeleton className="mt-2 h-3 w-full" />
                    <Skeleton className="mt-1.5 h-3 w-5/6" />
                  </div>
                ))}
              </div>
            ) : showcase.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Compass}
                  title="ยังไม่มีด่านเปิดใช้งาน"
                  description="ผู้ดูแลระบบยังไม่ได้เปิดด่านใดเลย ลองกลับมาใหม่ภายหลัง"
                />
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {showcase.map((lab, i) => (
                  <LabCard key={lab.id} lab={lab} active={activeInstance?.labId === lab.id && activeInstance?.status === 'RUNNING'}
                    starting={activeInstance?.labId === lab.id && activeInstance?.status === 'STARTING'} index={i} />
                ))}
              </div>
            )}
          </section>

          {nextUp && user && (
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-paper-strong bg-paper-soft">
                <Compass className="h-5 w-5 text-ink-soft" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-ink-muted">ด่านที่ควรทำต่อ</p>
                <p className="truncate text-sm font-semibold text-ink">{nextUp.title}</p>
                <p className="text-xs text-ink-muted">
                  {nextUp.tags?.[0] ?? 'ด่านใหม่'} · {nextUp.timeoutMin} นาที · +{nextUp.points} คะแนน
                </p>
              </div>
              <Link to={`/labs/${nextUp.id}`} className="btn-primary btn-sm shrink-0">
                เปิดด่าน
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Achievements preview */}
            <Card>
              <CardHeader
                title="เหรียญของคุณ"
                action={
                  <Link to="/badges" className="text-xs font-medium text-ink-soft hover:text-ink">
                    ดูทั้งหมด
                  </Link>
                }
              />
              <div className="flex flex-wrap gap-2 p-4">
                {badges.length === 0
                  ? [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-12 rounded-2xl" />)
                  : badges.slice(0, 5).map((b) => {
                      const owned = profile?.badges?.some((ub) => ub.id === b.id);
                      return <BadgeMedallion key={b.id} badge={b} earned={owned} showLock />;
                    })}
              </div>
              {user && profile && (
                <div className="border-t border-paper-line px-4 py-2.5 text-xs text-ink-muted">
                  ปลดล็อกแล้ว <b className="text-ink">{profile.badges.length}</b> / {badges.length} เหรียญ
                </div>
              )}
            </Card>

            {/* Progress */}
            <Card>
              <CardHeader title="ความคืบหน้า" />
              <div className="flex items-center gap-5 p-4">
                <ProgressRing
                  value={user ? profile?.completion ?? 0 : 0}
                  size={76}
                  label={user ? `${profile?.completion ?? 0}%` : '—'}
                />
                <div className="min-w-0 space-y-1.5 text-[13px]">
                  <div className="flex justify-between gap-3">
                    <span className="text-ink-muted">พิชิตแล้ว</span>
                    <b className="num font-mono text-ink">{user ? profile?.totalSolves ?? 0 : 0}</b>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-ink-muted">ด่านทั้งหมด</span>
                    <b className="num font-mono text-ink">{profile?.totalSolvedLabs ?? labs.length}</b>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-ink-muted">อันดับ</span>
                    <b className="num font-mono text-ink">{user ? (profile?.rank ? `#${profile.rank}` : '—') : '—'}</b>
                  </div>
                  {!user && (
                    <Link to="/register" className="btn-accent btn-sm mt-1 w-full">
                      สมัครเพื่อเก็บสถิติ
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* ------------------------------ right rail ------------------------------ */}
        <aside className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader
              title="ตารางอันดับ"
              action={
                <Link to="/leaderboard" className="text-xs font-medium text-ink-soft hover:text-ink">
                  ทั้งหมด
                </Link>
              }
              className="border-b-0 pb-1"
            />
            <div className="divide-y divide-dashed divide-paper-line">
              {leaders.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-ink-faint">ยังไม่มีผู้เล่นเก็บคะแนน</p>
              ) : (
                leaders.map((entry) => (
                  <LeaderboardRow key={entry.id} entry={entry} isMe={entry.id === user?.id} showBadges={false} />
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="กำลังเกิดขึ้น" />
            {activity.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-ink-faint">ยังไม่มีกิจกรรม</p>
            ) : (
              <ul className="divide-y divide-dashed divide-paper-line px-4">
                {activity.map((e, i) => (
                  <ActivityItem key={`${e.type}-${i}`} event={e} />
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <p className="mb-1 text-sm font-semibold text-ink">วิธีเริ่ม</p>
            <p className="text-[13px] leading-relaxed text-ink-muted">
              เปิดด่าน แล้วกด Start ระบบจะสร้างคอนเทนเนอร์และลิงก์ให้คุณคนเดียว
              จากนั้นใช้ Burp Suite หรือ DevTools ตรวจเป้าหมาย
            </p>
            <Button size="sm" className="mt-3" onClick={() => (window.location.href = '/labs')}>
              <BookOpen className="h-3.5 w-3.5" />
              ไปหน้าด่านทดสอบ
            </Button>
          </Card>

          {stats && (
            <div className="flex items-center justify-between rounded-card border border-paper-line bg-paper-soft px-4 py-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-ink-muted" />
                <span className="text-xs text-ink-muted">container ที่กำลังรัน</span>
              </div>
              <span className="num font-mono text-sm font-semibold text-ink">{stats.activeInstances ?? 0}</span>
            </div>
          )}
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-paper-line bg-paper-soft px-4 py-3 text-xs text-ink-muted">
        <span>
          เข้าระบบแล้วเริ่มได้ทันที · 1 ผู้เล่น = 1 container · หมดเวลาแล้วปิดอัตโนมัติ
        </span>
        <span className="font-mono text-ink-faint">v1.1 · {pointsLabel(labs.length)} labs</span>
      </div>
    </div>
  );
}
