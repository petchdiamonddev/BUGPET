import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clipboard,
  Clock3,
  ExternalLink,
  Flag as FlagIcon,
  Loader2,
  Play,
  RotateCcw,
  ShieldCheck,
  Square,
  Terminal,
  Trophy,
  Users,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLabSession, urgencyOf } from '../hooks/useLabSession';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/Modal';
import { cn, formatDuration, relativeTime, DIFFICULTY } from '../lib/format';
import {
  Avatar,
  Card,
  DifficultyBadge,
  EmptyState,
  Meter,
  Skeleton,
  Spinner,
  StatusDot,
} from '../components/ui/Primitives';

const STEPS = [
  { key: 'start', label: 'เปิด container', hint: 'สร้าง environment เฉพาะคุณ' },
  { key: 'hack', label: 'เจาะเป้าหมาย', hint: 'หา input ที่ไม่ปลอดภัย' },
  { key: 'flag', label: 'ส่ง flag', hint: 'รับคะแนน + เหรียญ' },
];

function StepTracker({ current }) {
  return (
    <ol className="flex items-center gap-1.5">
      {STEPS.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'todo';
        return (
          <li key={step.key} className="flex flex-1 items-center gap-1.5">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-1.5">
                <span
                  className={cn(
                    'grid h-4 w-4 shrink-0 place-items-center rounded-full font-mono text-[9px] font-bold',
                    state === 'done' && 'bg-moss text-white',
                    state === 'active' && 'bg-ink text-paper-raised',
                    state === 'todo' && 'border border-paper-strong text-ink-faint'
                  )}
                >
                  {state === 'done' ? <Check className="h-2.5 w-2.5" strokeWidth={3.5} /> : i + 1}
                </span>
                <span className={cn('truncate text-[11px] font-semibold', state === 'todo' ? 'text-ink-faint' : 'text-ink')}>
                  {step.label}
                </span>
              </div>
              <div className={cn('h-[3px] rounded-full', state === 'todo' ? 'bg-paper-line' : state === 'done' ? 'bg-moss' : 'bg-ink')} />
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="mb-2 h-3 w-3 shrink-0 text-ink-faint" />}
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------ Start panel ----------------------------- */
function StartPanel({ lab, onStarted }) {
  const { user } = useAuth();
  const { start, busy } = useLabSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const handleStart = async () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/labs/${lab.id}` } } });
      return;
    }
    setError(null);
    try {
      const res = await start(lab.id);
      toast.success('กำลังเตรียม container', 'ปกติใช้เวลาไม่เกิน 10–20 วินาที ระบบจะอัปเดตสถานะให้อัตโนมัติ');
      onStarted?.(res.data);
    } catch (err) {
      if (err.code === 'ACTIVE_INSTANCE_EXISTS') {
        setError({ message: err.message, conflict: err.data?.activeInstance });
      } else {
        setError({ message: err.message });
      }
    }
  };

  return (
    <div className="space-y-3">
      <ul className="grid gap-1.5 text-[13px] text-ink-soft">
        {[
          `container แยกเฉพาะคุณ (ไม่แชร์กับผู้เล่นอื่น)`,
          `เปิดใช้งานได้ ${lab.timeoutMin} นาที แล้วปิดอัตโนมัติ`,
          'ลิงก์จะแสดงที่นี่และในแถบ lab ด้านล่างจอ',
        ].map((line) => (
          <li key={line} className="flex items-start gap-2">
            <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-moss" strokeWidth={3} />
            {line}
          </li>
        ))}
      </ul>

      {error && (
        <div className="rounded-xl border border-ember/30 bg-ember-soft p-3 text-[13px] text-ember-deep">
          <p className="font-semibold">ยังเริ่มด่านนี้ไม่ได้</p>
          <p className="mt-0.5 leading-relaxed">{error.message}</p>
          {error.conflict && (
            <Link to={`/labs/${error.conflict.labId}`} className="btn-ghost btn-sm mt-2 bg-paper-raised text-ink">
              ไปที่ด่านที่กำลังรัน
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}

      <button onClick={handleStart} disabled={busy === 'starting'} className="btn-accent btn-lg w-full">
        {busy === 'starting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
        {busy === 'starting' ? 'กำลังเริ่ม…' : user ? 'เริ่มด่านนี้' : 'เข้าสู่ระบบเพื่อเริ่ม'}
      </button>
    </div>
  );
}

/* ------------------------------ Live panel ----------------------------- */
function LivePanel({ lab, instance, onStopped }) {
  const { stop, busy, remainingMs, progress, now } = useLabSession();
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [copied, setCopied] = useState(false);
  const urgency = urgencyOf(remainingMs);
  const color = { normal: 'text-moss-deep', warning: 'text-[#8a6a08]', critical: 'text-ember-deep', expired: 'text-ember-deep' }[urgency];

  const copy = async () => {
    await navigator.clipboard.writeText(instance.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success('คัดลอกแล้ว', instance.url, { duration: 2000 });
  };

  const handleStop = async () => {
    const ok = await confirm({
      title: 'หยุดด่านนี้?',
      description: 'container และทุกความคืบหน้าใน lab จะหายไป แต่ flag ที่ส่งแล้วยังได้คะแนนปกติ',
      confirmLabel: 'หยุดด่าน',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await stop(instance.id);
      toast.info('กำลังหยุด container', 'ระบบจะลบ environment ให้ภายในไม่กี่วินาที');
      onStopped?.();
    } catch (err) {
      toast.error('หยุดด่านไม่สำเร็จ', err.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="terminal overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-night-line px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-ember/80" />
              <span className="h-2 w-2 rounded-full bg-[#e2c822]/80" />
              <span className="h-2 w-2 rounded-full bg-moss/80" />
            </span>
            <span className="font-mono text-[10px] text-night-text/50">target · isolated container</span>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-acid">
            <StatusDot tone="moss" pulse />
            RUNNING
          </span>
        </div>

        <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center">
          <a
            href={instance.url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate font-mono text-[12px] text-night-text/85 transition-colors hover:text-acid hover:underline"
          >
            {instance.url}
          </a>
          <div className="flex shrink-0 items-center gap-1.5">
            <button onClick={copy} className="btn btn-sm bg-night-raised text-night-text hover:bg-night-line">
              {copied ? <Check className="h-3.5 w-3.5 text-acid" /> : <Clipboard className="h-3.5 w-3.5" />}
              {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
            </button>
            <a href={instance.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm bg-acid text-acid-ink hover:bg-acid-deep">
              เปิดเป้าหมาย
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-night-line border-t border-night-line bg-night-soft/60 font-mono text-[10px]">
          {[
            { k: 'starts', v: new Date(instance.startedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) },
            { k: 'expires', v: new Date(instance.expiresAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) },
            { k: 'elapsed', v: formatDuration(now - new Date(instance.startedAt).getTime()) },
          ].map((cell) => (
            <div key={cell.k} className="px-3 py-1.5">
              <div className="text-night-text/40">{cell.k}</div>
              <div className="num text-night-text/80">{cell.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-paper-line bg-paper-soft px-3 py-2">
        <Clock3 className={cn('h-4 w-4 shrink-0', color)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-ink-muted">เวลาที่เหลือ</span>
            <span className={cn('num font-mono text-sm font-semibold', color)}>{formatDuration(remainingMs)}</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-paper-line">
            <div
              className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', {
                'bg-moss': urgency === 'normal',
                'bg-[#e2c822]': urgency === 'warning',
                'bg-ember': urgency === 'critical' || urgency === 'expired',
              })}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <button
          onClick={handleStop}
          disabled={busy === 'stopping'}
          className="btn-ghost btn-sm shrink-0 text-ember-deep hover:border-ember/40 hover:bg-ember-soft"
        >
          <Square className="h-3 w-3 fill-current" />
          หยุด
        </button>
      </div>
      {confirmDialog}
    </div>
  );
}

function StartingPanel() {
  return (
    <div className="terminal overflow-hidden p-4">
      <div className="flex items-center gap-2 font-mono text-[12px] text-night-text/80">
        <Spinner className="h-3.5 w-3.5 text-acid" />
        <span>provisioning container…</span>
      </div>
      <ul className="mt-3 space-y-1.5 font-mono text-[11px] text-night-text/45">
        <li className="text-acid">✓ queued · bullmq job start-lab</li>
        <li className="text-acid">✓ network · petbug_net</li>
        <li>→ pulling docker image &amp; starting…</li>
        <li className="text-night-text/30">→ writing traefik route…</li>
      </ul>
    </div>
  );
}

/* ---------------------------- Flag submitter --------------------------- */
function FlagPanel({ lab, solved, onSolved }) {
  const { user, applyPoints, refreshActiveInstance } = useAuth();
  const toast = useToast();
  const [value, setValue] = useState('');
  const [state, setState] = useState({ status: 'idle' });
  const inputRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    if (!user) return;
    setState({ status: 'loading' });
    try {
      const res = await api.post(`/solves/labs/${lab.id}/submit`, { flag: value.trim() });
      setState({ status: 'success', result: res });

      confetti({
        particleCount: 140,
        spread: 75,
        origin: { y: 0.65 },
        colors: ['#d5f24a', '#191818', '#2f7a58', '#ff5c2b'],
        disableForReducedMotion: true,
      });

      toast.reward(
        res.isFirstBlood ? 'FIRST BLOOD! 🩸' : 'พิชิตด่านสำเร็จ 🎉',
        `+${res.earnedPoints} คะแนน${res.bonusPoints ? ` และโบนัสเหรียญอีก +${res.bonusPoints}` : ''}`
      );
      if (res.newBadges?.length) {
        toast.reward(
          `ได้เหรียญใหม่ ${res.newBadges.length} เหรียญ`,
          res.newBadges.map((b) => b.name).join(', ')
        );
      }
      if (res.user?.points) applyPoints(res.user.points);
      setValue('');
      // The lab is solved, so the container is being torn down server-side.
      // Drop the dock right away and confirm the state in the background.
      refreshActiveInstance();
      setTimeout(() => refreshActiveInstance(), 4000);
      onSolved?.(res);
    } catch (err) {
      setState({ status: 'error', message: err.message, code: err.code });
    }
  };

  if (solved) {
    return (
      <div className="rounded-xl border border-moss/30 bg-moss-soft p-4">
        <div className="flex items-center gap-2 text-moss-deep">
          <Trophy className="h-4 w-4" />
          <span className="font-display text-sm font-semibold">คุณพิชิตด่านนี้แล้ว</span>
        </div>
        <p className="mt-1 text-[13px] text-moss-deep/80">
          ได้รับ {lab.points} คะแนน {lab.solvedAt && `เมื่อ ${relativeTime(lab.solvedAt)}`}
        </p>
      </div>
    );
  }

  const isErr = state.status === 'error';
  const isSolvedNow = state.status === 'success';

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <div>
        <label className="label" htmlFor="flag-input">
          Flag ที่พบ <span className="font-normal text-ink-faint">(รูปแบบ PETBUG{'{...}'})</span>
        </label>
        <div className="relative">
          <Terminal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            id="flag-input"
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (isErr) setState({ status: 'idle' });
              if (isSolvedNow) setState({ status: 'loading' });
            }}
            placeholder="PETBUG{...}"
            spellCheck={false}
            autoComplete="off"
            disabled={!user || state.status === 'loading' || isSolvedNow}
            className={cn('input pl-9 font-mono text-[13px]', isErr && 'input-error')}
          />
        </div>
      </div>

      {isErr && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-ember-deep">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-ember/15">!</span>
          {state.message}
        </p>
      )}
      {isSolvedNow && (
        <p className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-moss-deep">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
          {state.result.message}
          {state.result.isFirstBlood && <span className="chip chip-ember">FIRST BLOOD</span>}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={!user || !value.trim() || state.status === 'loading' || isSolvedNow} className="btn-primary flex-1">
          {state.status === 'loading' ? <Spinner className="h-4 w-4" /> : <FlagIcon className="h-4 w-4" />}
          {state.status === 'loading' ? 'กำลังตรวจสอบ…' : 'ส่ง Flag'}
        </button>
        <button
          type="button"
          onClick={() => {
            setValue('');
            setState({ status: 'idle' });
            inputRef.current?.focus();
          }}
          className="btn-ghost"
          aria-label="ล้างช่องกรอก"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
      {!user && (
        <p className="text-xs text-ink-muted">
          <Link to="/login" className="font-semibold text-ink underline decoration-paper-strong underline-offset-2 hover:decoration-ink">
            เข้าสู่ระบบ
          </Link>{' '}
          เพื่อส่ง flag และเก็บคะแนน
        </p>
      )}
    </form>
  );
}

/* -------------------------------- Page --------------------------------- */
export default function LabDetailPage() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const { activeInstance, poll, isThisLab } = useLabSession();
  const [lab, setLab] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(null);

  const load = async () => {
    try {
      const res = await api.get(`/labs/${id}`);
      setLab(res.data);
      setRelated(res.meta?.related ?? []);
      setNotFound(null);
    } catch (err) {
      setNotFound(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Prefer the global (freshly polled) instance for THIS lab; fall back to the
  // copy embedded in the lab payload so a page refresh mid-lab still renders.
  const instance = useMemo(() => {
    if (isThisLab(id)) return activeInstance;
    return lab?.activeInstance ?? null;
  }, [activeInstance, lab?.activeInstance, id, isThisLab]);

  // While starting, poll faster so the URL appears as soon as it's ready.
  useEffect(() => {
    if (!instance || instance.status !== 'STARTING') return undefined;
    const t = setInterval(poll, 2500);
    return () => clearInterval(t);
  }, [instance, poll]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <div className="card space-y-4 p-6">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (notFound || !lab) {
    return (
      <Card>
        <EmptyState
          icon={ShieldCheck}
          title="ไม่พบด่านนี้"
          description={notFound?.message ?? 'ด่านอาจถูกปิดหรือลบไปแล้ว'}
          action={
            <Link to="/labs" className="btn-primary btn-sm">
              กลับไปหน้าด่าน
            </Link>
          }
        />
      </Card>
    );
  }

  const solved = lab.isSolved;
  const live = instance?.status === 'RUNNING';
  const starting = instance?.status === 'STARTING';
  const currentStep = solved ? 3 : live || starting ? 1 : 0;

  // Same control panel in two places: inline under the title on mobile (so
  // "Start" is immediately reachable) and as a sticky sidebar on desktop.
  const environmentPanel = (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[15px] font-semibold text-ink">สภาพแวดล้อมเป้าหมาย</h2>
        <span className="chip-neutral">isolated</span>
      </div>
      {starting ? (
        <StartingPanel />
      ) : live ? (
        <LivePanel lab={lab} instance={instance} onStopped={() => poll()} />
      ) : (
        <StartPanel lab={lab} onStarted={() => poll()} />
      )}
    </Card>
  );

  return (
    <div className="space-y-4">
      <Link to="/labs" className="group inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        ด่านทดสอบทั้งหมด
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ------------------------------- main ------------------------------- */}
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <div className={cn('h-1', { EASY: 'bg-moss', MEDIUM: 'bg-ember', HARD: 'bg-plum' }[lab.difficulty])} />
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <DifficultyBadge difficulty={lab.difficulty} />
                <span className="chip-neutral">
                  <Clock3 className="h-3 w-3" />
                  {lab.timeoutMin} นาที
                </span>
                <span className="chip-neutral">
                  <Users className="h-3 w-3" />
                  {lab.solvesCount} คนผ่านแล้ว
                </span>
                {lab.isFirstBlood && lab.firstBlood && (
                  <span className="chip chip-ember">
                    <Trophy className="h-3 w-3" />
                    first blood: {lab.firstBlood.username}
                  </span>
                )}
                {solved && <span className="chip chip-moss"><Check className="h-3 w-3" />พิชิตแล้ว</span>}
              </div>

              <h1 className="mt-3 text-balance font-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[32px]">
                {lab.title}
              </h1>
              <p className="mt-1.5 text-sm text-ink-muted">{lab.shortDescription}</p>

              <div className="mt-4">
                <StepTracker current={currentStep} />
              </div>

              {/* Mobile: the Start/Stop controls come before the long brief. */}
              <div className="mt-4 lg:hidden">{environmentPanel}</div>

              <div className="mt-5 space-y-2">
                <h2 className="eyebrow">brief / รายละเอียดภารกิจ</h2>
                <div className="whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{lab.description}</div>
              </div>

              {lab.tags?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {lab.tags.map((t) => (
                    <Link
                      key={t}
                      to={`/labs?tag=${encodeURIComponent(t)}`}
                      className="rounded-md bg-paper-soft px-2 py-1 font-mono text-[11px] text-ink-muted transition-colors hover:bg-paper-line hover:text-ink"
                    >
                      #{t}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Flag */}
          <Card>
            <div className="flex items-center justify-between border-b border-paper-line px-4 py-3">
              <div>
                <div className="eyebrow">proof of work</div>
                <h3 className="font-display text-[15px] font-semibold text-ink">ส่ง Flag</h3>
              </div>
              <span className="chip chip-acid">
                <Zap className="h-3 w-3" />+{lab.points} pts
              </span>
            </div>
            <div className="p-4">
              <FlagPanel lab={lab} solved={solved} onSolved={() => load()} />
            </div>
          </Card>

          {lab.recentSolvers?.length > 0 && (
            <Card>
              <div className="flex items-center justify-between border-b border-paper-line px-4 py-2.5">
                <h3 className="text-[13px] font-semibold text-ink">ใครผ่านด่านนี้บ้าง</h3>
                <span className="font-mono text-[11px] text-ink-faint">{lab.solvesCount} solvers</span>
              </div>
              <ul className="divide-y divide-dashed divide-paper-line">
                {lab.recentSolvers.map((s, i) => (
                  <li key={`${s.userId}-${i}`} className="flex items-center gap-3 px-4 py-2">
                    <Avatar name={s.username} size={26} />
                    <Link to={`/players/${s.userId}`} className="flex-1 truncate text-[13px] font-medium text-ink hover:underline">
                      {s.username}
                    </Link>
                    <span className="font-mono text-[11px] text-ink-faint">{relativeTime(s.solvedAt)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* ------------------------------- aside ------------------------------ */}
        <aside className="space-y-4">
          <div className="sticky top-[72px] hidden max-h-[calc(100vh-96px)] space-y-4 overflow-y-auto pb-2 no-scrollbar lg:block">
            {environmentPanel}
          </div>

          <Card className="p-4">
            <h2 className="mb-3 font-display text-[15px] font-semibold text-ink">สถิติด่าน</h2>
            <dl className="space-y-2.5 text-[13px]">
              {[
                ['ผู้ผ่านด่าน', `${lab.solvesCount} คน`],
                ['อัตราความสำเร็จ', lab.successRate != null ? `${lab.successRate}%` : '—'],
                ['ระยะเวลา', `${lab.timeoutMin} นาที`],
                ['คะแนน', `+${lab.points}`],
                ['เพิ่มเมื่อ', lab.createdAt ? relativeTime(lab.createdAt) : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="num font-mono text-[12px] font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            {lab.successRate != null && (
              <Meter className="mt-3" value={lab.successRate} tone="moss" />
            )}
            {isAdmin && lab.dockerImage && (
              <div className="mt-3 rounded-lg bg-night px-2.5 py-1.5 font-mono text-[10px] text-night-text/70">
                image · {lab.dockerImage}
              </div>
            )}
          </Card>

          {related.length > 0 && (
            <Card>
              <div className="border-b border-paper-line px-4 py-2.5">
                <h3 className="text-[13px] font-semibold text-ink">ด่านใกล้เคียง ({DIFFICULTY[lab.difficulty]?.label})</h3>
              </div>
              <ul className="divide-y divide-dashed divide-paper-line">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link to={`/labs/${r.id}`} className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-paper-soft">
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{r.title}</span>
                      <span className="num font-mono text-[11px] text-ink-faint">+{r.points}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-ink-faint" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
