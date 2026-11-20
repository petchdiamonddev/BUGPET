import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clipboard,
  Clock3,
  ExternalLink,
  Flag as FlagIcon,
  Loader2,
  Play,
  ShieldCheck,
  Square,
  Terminal,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLabSession, urgencyOf } from '../hooks/useLabSession';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/Modal';
import { cn, formatDuration, relativeTime, DIFFICULTY } from '../lib/format';
import { BRAND } from '../config/brand';
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

/* ========================================================================== */
/*  Small building blocks                                                     */
/* ========================================================================== */

const ACCENT_BAR = { EASY: 'bg-moss', MEDIUM: 'bg-ember', HARD: 'bg-plum' };

/** A stat block for the right-hand column. */
function Stat({ label, value, hint, tone }) {
  const tones = {
    ink: 'text-ink',
    moss: 'text-moss-deep',
    ember: 'text-ember-deep',
    muted: 'text-ink-muted',
  };
  return (
    <div className="rounded-xl border border-paper-line bg-paper-soft/60 px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">{label}</p>
      <p className={cn('num mt-0.5 font-display text-lg font-bold leading-tight', tones[tone] ?? tones.ink)}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[10px] leading-snug text-ink-faint">{hint}</p>}
    </div>
  );
}

/** Numbered checklist extracted from the lab brief ("1. …", "2. …"). */
const extractSteps = (description) => {
  const lines = description.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.filter((l) => /^\d+[.)]\s+/.test(l)).map((l) => l.replace(/^\d+[.)]\s+/, ''));
};

function ObjectiveList({ steps }) {
  return (
    <ol className="mt-3 space-y-2">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-soft">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-paper-strong bg-paper-soft font-mono text-[10px] font-bold text-ink-muted">
            {i + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

/* ========================================================================== */
/*  Terminal card: a lab "session"                                           */
/* -------------------------------------------------------------------------- */
/*  One component owns every lifecycle state the player can hit:             */
/*   idle → starting → running → (solved | stopped | failed)                  */
/*  Keeping them together is what stops the panel from lagging behind the    */
/*  real container state, which was the old page's main problem.             */
/* ========================================================================== */

function SessionCard({ lab, instance, solved, onChanged }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const { start, stop, busy, remainingMs, progress, now, poll } = useLabSession();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const status = instance?.status ?? 'IDLE';
  const isStarting = status === 'STARTING';
  const isRunning = status === 'RUNNING';
  const isError = status === 'ERROR';

  const elapsedSec = instance?.startedAt ? Math.max(0, Math.round((now - new Date(instance.startedAt).getTime()) / 1000)) : 0;
  const urgency = urgencyOf(remainingMs);
  const timeTone =
    urgency === 'critical' || urgency === 'expired'
      ? 'text-[#ff8a5c]'
      : urgency === 'warning'
        ? 'text-[#ffc35c]'
        : 'text-acid';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(instance.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('คัดลอกไม่สำเร็จ', 'เบราว์เซอร์ไม่อนุญาตให้เข้าถึงคลิปบอร์ด');
    }
  };

  const handleStart = async () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/labs/${lab.id}` } } });
      return;
    }
    setError(null);
    try {
      await start(lab.id);
      toast.success('เริ่มสร้างคอนเทนเนอร์', 'ระบบจะปล่อยลิงก์เมื่อเป้าหมายพร้อมตอบจริง');
      onChanged?.();
    } catch (err) {
      setError({ message: err.message, code: err.code, conflict: err.data?.activeInstance });
    }
  };

  const handleStop = async () => {
    const ok = await confirm({
      title: 'หยุดด่านนี้?',
      description: 'คอนเทนเนอร์และทุกอย่างที่ค้างอยู่ใน lab จะถูกลบ — คะแนนที่ได้แล้วยังอยู่',
      confirmLabel: 'หยุดด่าน',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await stop(instance.id);
      toast.info('กำลังหยุดคอนเทนเนอร์', 'รอสักครู่ระบบจะปิดให้');
      onChanged?.();
    } catch (err) {
      toast.error('หยุดด่านไม่สำเร็จ', err.message);
    }
  };

  /* ------------------------------ status line ----------------------------- */
  const header = {
    IDLE: { text: 'พร้อมเริ่ม', dot: 'muted', icon: Terminal },
    STARTING: { text: 'กำลังสร้าง', dot: 'acid', icon: Loader2 },
    RUNNING: { text: 'กำลังทำงาน', dot: 'moss', icon: Terminal },
    ERROR: { text: 'เริ่มไม่สำเร็จ', dot: 'ember', icon: Terminal },
  }[status] ?? { text: status, dot: 'muted', icon: Terminal };

  const StatusIcon = header.icon;

  return (
    <div className="terminal overflow-hidden">
      {/* window chrome + live status */}
      <div className="flex items-center justify-between gap-2 border-b border-night-line px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex shrink-0 gap-1" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-[#ff5f57]/75" />
            <span className="h-2 w-2 rounded-full bg-[#febc2e]/75" />
            <span className="h-2 w-2 rounded-full bg-[#28c840]/75" />
          </span>
          <span className="truncate font-mono text-[10px] text-night-text/45">
            {isRunning ? new URL(instance.url).host : 'petbug — lab session'}
          </span>
        </div>
        <span
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]',
            isRunning && 'border-moss/40 text-[#9fdcb8]',
            isStarting && 'border-[#c9a70f]/40 text-[#ffd75e]',
            isError && 'border-ember/40 text-[#ff9a7a]',
            status === 'IDLE' && 'border-night-line text-night-text/45'
          )}
        >
          <StatusIcon className={cn('h-2.5 w-2.5', isStarting && 'animate-spin')} strokeWidth={2.5} />
          {header.text}
        </span>
      </div>

      {/* ---------------- body ---------------- */}
      <div className="px-3.5 py-3">
        {/* IDLE / ERROR → start */}
        {(status === 'IDLE' || isError) && (
          <div className="space-y-3">
            <ul className="space-y-1.5 text-[12px] text-night-text/65">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-moss" strokeWidth={3} />
                คอนเทนเนอร์แยกเฉพาะคุณ ไม่แชร์กับคนอื่น
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-moss" strokeWidth={3} />
                เปิดได้ {lab.timeoutMin} นาที แล้วปิดอัตโนมัติ
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-moss" strokeWidth={3} />
                ลิงก์จะขึ้นเมื่อเป้าหมายตอบกลับแล้วเท่านั้น
              </li>
            </ul>

            {error && (
              <div className="rounded-lg border border-ember/40 bg-ember/10 p-2.5 text-[12px] leading-relaxed text-[#ffb49a]">
                <p>{error.message}</p>
                {error.conflict && (
                  <Link to={`/labs/${error.conflict.labId}`} className="mt-1.5 inline-flex items-center gap-1 font-semibold text-white underline">
                    ไปที่ด่านที่กำลังรัน <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleStart}
              disabled={busy === 'starting'}
              className="btn w-full bg-acid text-acid-ink shadow-[0_2px_0_#8aa61a] hover:bg-acid-deep disabled:opacity-60"
            >
              {busy === 'starting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
              {user ? (isError ? 'ลองอีกครั้ง' : 'เริ่มด่าน') : 'เข้าสู่ระบบเพื่อเริ่ม'}
            </button>
          </div>
        )}

        {/* STARTING → honest progress */}
        {isStarting && (
          <div className="space-y-3">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="flex items-center gap-1.5 text-night-text/70">
                <Loader2 className="h-3 w-3 animate-spin text-acid" />
                กำลังเปิดคอนเทนเนอร์
              </span>
              <span className="num text-night-text/45">{elapsedSec}s</span>
            </div>

            <div className="h-1 overflow-hidden rounded-full bg-night-line">
              <div
                className="h-full rounded-full bg-acid/80 transition-[width] duration-700 ease-out"
                style={{ width: `${Math.min(94, Math.max(6, (elapsedSec / 20) * 100))}%` }}
              />
            </div>

            <p className="text-[11px] leading-relaxed text-night-text/45">
              {elapsedSec > 30
                ? 'ครั้งแรกอาจต้องดาวน์โหลด image — ใช้เวลานานขึ้นได้ กำลังดำเนินการอยู่'
                : 'เชื่อมต่อเป้าหมายจนกว่าจะตอบกลับ แล้วจึงปล่อยลิงก์ให้ — ยังไม่ต้องกดเปิด'}
            </p>

            <button
              type="button"
              onClick={handleStop}
              disabled={busy === 'stopping'}
              className="btn btn-sm w-full border border-night-line bg-night-raised text-night-text/80 hover:bg-night-line"
            >
              <Square className="h-3 w-3 fill-current" />
              ยกเลิกการเริ่ม
            </button>
          </div>
        )}

        {/* RUNNING → link + timer */}
        {isRunning && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-night-line bg-night-raised/70 px-2.5 py-2">
              <a
                href={instance.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate font-mono text-[11px] text-night-text/85 hover:text-acid hover:underline"
              >
                {instance.url}
              </a>
              <button
                type="button"
                onClick={copy}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-night-text/60 hover:bg-night-line hover:text-white"
                aria-label="คัดลอกลิงก์"
                title="คัดลอกลิงก์"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-acid" /> : <Clipboard className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-night-text/40">
                เวลาที่เหลือ
              </span>
              <span className={cn('num font-mono text-lg font-bold tabular-nums', timeTone)}>
                {formatDuration(remainingMs)}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-night-line">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-1000 ease-linear',
                  urgency === 'normal' ? 'bg-moss' : urgency === 'warning' ? 'bg-[#e2c822]' : 'bg-ember'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex gap-2">
              <a
                href={instance.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn flex-1 bg-acid text-acid-ink shadow-[0_2px_0_#8aa61a] hover:bg-acid-deep"
              >
                เปิดเป้าหมาย
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={handleStop}
                disabled={busy === 'stopping'}
                className="btn border border-night-line bg-night-raised px-3 text-night-text/75 hover:bg-ember/15 hover:text-ember"
                aria-label="หยุดด่าน"
                title="หยุดด่าน"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            </div>
          </div>
        )}

        {/* SOLVED → done */}
        {solved && !isRunning && !isStarting && (
          <div className="flex items-start gap-2 rounded-lg border border-moss/35 bg-moss/12 p-2.5 text-[12px] text-[#a9e5c2]">
            <Trophy className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>ด่านนี้คุณพิชิตแล้ว — ลิงก์คอนเทนเนอร์ถูกปิดไปแล้ว</span>
          </div>
        )}
      </div>

      {confirmDialog}
    </div>
  );
}

/* ========================================================================== */
/*  Flag submission                                                          */
/* ========================================================================== */

function FlagCard({ lab, solved, solvedAt, onSolved }) {
  const { user, applyPoints, refreshActiveInstance } = useAuth();
  const toast = useToast();
  const [value, setValue] = useState('');
  const [state, setState] = useState({ status: 'idle' });
  const inputRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!value.trim() || !user) return;
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
        res.isFirstBlood ? 'FIRST BLOOD!' : 'พิชิตด่านสำเร็จ',
        `+${res.earnedPoints} คะแนน${res.bonusPoints ? ` และโบนัสเหรียญ +${res.bonusPoints}` : ''}`
      );
      if (res.newBadges?.length) {
        toast.reward(`ได้เหรียญใหม่ ${res.newBadges.length} เหรียญ`, res.newBadges.map((b) => b.name).join(', '));
      }
      if (res.user?.points) applyPoints(res.user.points);
      setValue('');
      refreshActiveInstance();
      setTimeout(() => refreshActiveInstance(), 4000);
      onSolved?.(res);
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  };

  if (solved) {
    return (
      <div className="rounded-xl border border-moss/30 bg-moss-soft px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-moss-deep">
          <Trophy className="h-4 w-4" /> พิชิตด่านนี้แล้ว
        </p>
        <p className="mt-0.5 text-[13px] text-moss-deep/80">
          ได้รับ {lab.points} คะแนน{solvedAt ? ` · ${relativeTime(solvedAt)}` : ''}
        </p>
      </div>
    );
  }

  const isError = state.status === 'error';
  const isSuccess = state.status === 'success';

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label htmlFor="flag-input" className="text-xs font-semibold text-ink-soft">
          Flag ที่พบ
        </label>
        <span className="font-mono text-[10px] text-ink-faint">
          รูปแบบ {BRAND.flagFormat}{'{...}'}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Terminal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            id="flag-input"
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (isError) setState({ status: 'idle' });
            }}
            placeholder={`${BRAND.flagFormat}{...}`}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            disabled={!user || state.status === 'loading' || isSuccess}
            className={cn('input pl-9 font-mono text-[13px]', isError && 'input-error')}
          />
        </div>
        <button
          type="submit"
          disabled={!user || !value.trim() || state.status === 'loading' || isSuccess}
          className="btn-primary shrink-0 sm:px-5"
        >
          {state.status === 'loading' ? <Spinner className="h-4 w-4" /> : <FlagIcon className="h-4 w-4" />}
          {state.status === 'loading' ? 'กำลังตรวจ…' : 'ส่ง Flag'}
        </button>
      </div>

      {isError && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-ember-deep">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-ember/15 text-[10px] font-bold">!</span>
          {state.message}
        </p>
      )}
      {isSuccess && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-moss-deep">
          <Check className="h-3.5 w-3.5" strokeWidth={3} /> {state.result.message}
        </p>
      )}
      {!user && (
        <p className="text-xs text-ink-muted">
          <Link to="/login" className="font-semibold text-ink underline underline-offset-2">
            เข้าสู่ระบบ
          </Link>{' '}
          เพื่อส่ง flag และเก็บคะแนน
        </p>
      )}
    </form>
  );
}

/* ========================================================================== */
/*  Page                                                                     */
/* ========================================================================== */

export default function LabDetailPage() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const { activeInstance, poll, isThisLab } = useLabSession();
  const [lab, setLab] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const res = await api.get(`/labs/${id}`);
      setLab(res.data);
      setRelated(res.meta?.related ?? []);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setLab(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Prefer the freshly polled global instance; fall back to the one embedded
  // in the lab payload so a hard refresh mid-session still renders.
  const instance = useMemo(() => {
    if (isThisLab(id)) return activeInstance;
    return lab?.activeInstance ?? null;
  }, [activeInstance, lab?.activeInstance, id, isThisLab]);

  // While starting, poll faster so the URL appears the moment it is ready.
  useEffect(() => {
    if (instance?.status !== 'STARTING') return undefined;
    const t = setInterval(poll, 2500);
    return () => clearInterval(t);
  }, [instance?.status, poll]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <Skeleton className="h-56 rounded-card" />
            <Skeleton className="h-32 rounded-card" />
          </div>
          <Skeleton className="h-72 rounded-card" />
        </div>
      </div>
    );
  }

  if (error || !lab) {
    return (
      <Card>
        <EmptyState
          icon={ShieldCheck}
          title="ไม่พบด่านนี้"
          description={error?.message ?? 'ด่านอาจถูกปิดหรือลบไปแล้ว'}
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
  const attempts = lab.attemptsCount ?? 0;

  // The brief usually ends with a numbered task list. Show the prose as prose
  // and the tasks once as a checklist — never both (that duplicated the text).
  const steps = extractSteps(lab.description);
  const prose = steps.length
    ? lab.description
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !/^\d+[.)]\s+/.test(l))
        .join('\n')
    : lab.description;

  // One instance rendered twice: inline at the top on mobile (so "Start" is
  // reachable without scrolling past the brief) and in the sticky sidebar on
  // desktop.
  const sessionCard = (
    <Card className="p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-ink">สภาพแวดล้อมเป้าหมาย</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">isolated</span>
      </div>
      <SessionCard lab={lab} instance={instance} solved={solved} onChanged={() => poll()} />
    </Card>
  );

  return (
    <div className="space-y-4">
      <Link
        to="/labs"
        className="group inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        ด่านทดสอบทั้งหมด
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ----------------------------- main ----------------------------- */}
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <div className={cn('h-1', ACCENT_BAR[lab.difficulty] ?? ACCENT_BAR.EASY)} />
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-1.5">
                <DifficultyBadge difficulty={lab.difficulty} />
                <span className="chip-neutral">
                  <Clock3 className="h-3 w-3" />
                  {lab.timeoutMin} นาที
                </span>
                <span className="chip-neutral">
                  <Zap className="h-3 w-3" />+{lab.points} คะแนน
                </span>
                <span className="chip-neutral">
                  <Users className="h-3 w-3" />
                  {lab.solvesCount} คนผ่าน
                </span>
                {solved && (
                  <span className="chip chip-moss">
                    <Check className="h-3 w-3" strokeWidth={3} />
                    พิชิตแล้ว
                  </span>
                )}
              </div>

              <h1 className="mt-3 text-balance font-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[32px]">
                {lab.title}
              </h1>

              {/* mobile-only: the session card comes before the long brief */}
              <div className="mt-4 lg:hidden">{sessionCard}</div>

              {lab.tags?.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
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

              <div className="mt-5">
                <h2 className="eyebrow">โจทย์</h2>
                {prose && (
                  <div className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{prose}</div>
                )}
                {steps.length > 0 && <ObjectiveList steps={steps} />}
              </div>

              {isAdmin && lab.dockerImage && (
                <p className="mt-4 rounded-lg bg-night px-2.5 py-1.5 font-mono text-[10px] text-night-text/70">
                  image · {lab.dockerImage}
                </p>
              )}
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <FlagIcon className="h-4 w-4 text-ink" />
              <h2 className="font-display text-[15px] font-semibold text-ink">ส่ง Flag</h2>
            </div>
            <FlagCard lab={lab} solved={solved} solvedAt={lab.solvedAt} onSolved={() => load()} />
          </Card>
        </div>

        {/* ----------------------------- aside ---------------------------- */}
        <aside className="space-y-4">
          <div className="hidden lg:sticky lg:top-[72px] lg:block lg:space-y-4">
            {sessionCard}

            <Card className="p-3.5">
              <h2 className="mb-2.5 text-[13px] font-semibold text-ink">สถิติ</h2>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="ผู้ผ่าน" value={`${lab.solvesCount}`} hint="คน" />
                <Stat
                  label="ความสำเร็จ"
                  value={lab.successRate != null ? `${Math.min(100, Math.max(0, Math.round(lab.successRate)))}%` : '—'}
                  hint={`จาก ${attempts} ครั้ง`}
                />
                <Stat label="เวลา" value={`${lab.timeoutMin}m`} hint="ต่อคอนเทนเนอร์" />
                <Stat label="คะแนน" value={`+${lab.points}`} hint="เมื่อส่ง flag ผ่าน" tone="moss" />
              </div>

              {lab.firstBlood && (
                <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-paper-line bg-paper-soft/60 px-2.5 py-2">
                  <Avatar name={lab.firstBlood.username} size={24} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-ink-faint">first blood</p>
                    <p className="truncate text-[12px] font-medium text-ink">{lab.firstBlood.username}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-ink-faint">
                    {relativeTime(lab.firstBlood.solvedAt)}
                  </span>
                </div>
              )}
            </Card>

            {lab.recentSolvers?.length > 0 && (
              <Card className="p-3.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <h2 className="text-[13px] font-semibold text-ink">เพิ่งผ่านด่าน</h2>
                  <span className="font-mono text-[10px] text-ink-faint">{lab.solvesCount} คน</span>
                </div>
                <ul className="divide-y divide-dashed divide-paper-line">
                  {lab.recentSolvers.map((s, i) => (
                    <li key={`${s.userId}-${i}`} className="flex items-center gap-2.5 py-1.5">
                      <Avatar name={s.username} size={22} />
                      <Link to={`/players/${s.userId}`} className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink hover:underline">
                        {s.username}
                      </Link>
                      <span className="shrink-0 font-mono text-[10px] text-ink-faint">{relativeTime(s.solvedAt)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {related.length > 0 && (
              <Card className="p-3.5">
                <h2 className="mb-1.5 text-[13px] font-semibold text-ink">
                  ด่านระดับ {DIFFICULTY[lab.difficulty]?.label}
                </h2>
                <ul className="-mx-1 divide-y divide-dashed divide-paper-line">
                  {related.map((r) => (
                    <li key={r.id}>
                      <Link
                        to={`/labs/${r.id}`}
                        className="flex items-center gap-2 rounded-lg px-1 py-2 transition-colors hover:bg-paper-soft"
                      >
                        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">{r.title}</span>
                        <span className="num shrink-0 font-mono text-[10px] text-ink-faint">+{r.points}</span>
                        <ArrowUpRight className="h-3 w-3 shrink-0 text-ink-faint" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
