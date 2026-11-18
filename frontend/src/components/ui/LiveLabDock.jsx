import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Copy, Check, Square, Terminal, Loader2, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLabSession, urgencyOf } from '../../hooks/useLabSession';
import { cn, formatDuration, DIFFICULTY } from '../../lib/format';
import { StatusDot } from './Primitives';
import { useConfirm } from './Modal';
import { api } from '../../lib/api';
import { useToast } from './Toast';

/**
 * Persistent dock that follows the player across pages while a container is
 * alive. Countdown is colour-coded by urgency; closing it is possible but it
 * reappears on the next route change so a lab can never be "forgotten".
 */
export default function LiveLabDock() {
  const { user } = useAuth();
  const { activeInstance, isStarting, remainingMs, progress, poll } = useLabSession();
  const [confirm, confirmDialog] = useConfirm();
  const [copied, setCopied] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [stopping, setStopping] = useState(false);
  const toast = useToast();

  if (!user || !activeInstance) return <>{confirmDialog}</>;

  // A solved lab is being torn down server-side; the dock would only show a
  // stale "remaining" timer, so get out of the way of the reward UI.
  if (activeInstance.stopReason === 'SOLVED' || activeInstance.status === 'STOPPED') return <>{confirmDialog}</>;

  const urgency = urgencyOf(remainingMs);
  const urgencyStyles = {
    normal: { text: 'text-night-text', bar: 'bg-acid', dot: 'moss' },
    warning: { text: 'text-[#ffc35c]', bar: 'bg-[#ffc35c]', dot: 'acid' },
    critical: { text: 'text-[#ff8a5c]', bar: 'bg-ember', dot: 'ember' },
    expired: { text: 'text-[#ff8a5c]', bar: 'bg-ember', dot: 'ember' },
  }[urgency];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(activeInstance.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast.success('คัดลอกลิงก์แล้ว', activeInstance.url, { duration: 2200 });
    } catch {
      toast.error('คัดลอกไม่สำเร็จ', 'เบราว์เซอร์ไม่อนุญาตให้เข้าถึงคลิปบอร์ด');
    }
  };

  const stop = async () => {
    const ok = await confirm({
      title: 'หยุดด่านนี้?',
      description: 'Container จะถูกลบและทรัพยากรทั้งหมดที่ค้างอยู่ใน lab จะหายไป',
      confirmLabel: 'หยุดด่าน',
      tone: 'danger',
    });
    if (!ok) return;
    setStopping(true);
    try {
      await api.post(`/instances/${activeInstance.id}/stop`);
      toast.info('กำลังหยุดด่าน', 'container กำลังถูกปิด…');
      await poll();
    } catch (err) {
      toast.error('หยุดด่านไม่สำเร็จ', err.message);
    } finally {
      setStopping(false);
    }
  };

  return (
    <>
      <div
        id="live-lab-dock"
        className="pointer-events-none fixed inset-x-0 bottom-[64px] z-30 flex justify-center px-3 md:bottom-5 md:justify-end md:px-5"
      >
        <div
          className={cn(
            'pointer-events-auto w-full max-w-[560px] overflow-hidden rounded-panel border border-night-line bg-night text-night-text shadow-lift transition-all duration-300 ease-snap',
            'animate-fade-up'
          )}
        >
          {/* Time-pressure bar — drains as the clock runs out. */}
          <div className="h-[3px] bg-night-raised">
            {isStarting ? (
              <div className="h-full w-1/3 animate-[shimmer_1.6s_infinite] bg-acid/60" />
            ) : (
              <div
                className={cn('h-full transition-[width] duration-1000 ease-linear', urgencyStyles.bar)}
                style={{ width: `${progress}%` }}
              />
            )}
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5">
            <button
              onClick={() => setMinimized((v) => !v)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              aria-label={minimized ? 'ขยายแถบ lab' : 'ย่อแถบ lab'}
            >
              <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-night-raised">
                {isStarting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-acid" />
                ) : (
                  <>
                    <Terminal className="h-4 w-4 text-acid" />
                    <span className="absolute -right-0.5 -top-0.5">
                      <StatusDot tone={urgencyStyles.dot} pulse />
                    </span>
                  </>
                )}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-semibold text-white">{activeInstance.labTitle}</span>
                  <ChevronDown className={cn('h-3 w-3 shrink-0 text-night-text/50 transition-transform', minimized && 'rotate-180')} />
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-night-text/60">
                  {isStarting ? (
                    'กำลังสร้าง container…'
                  ) : (
                    <>
                      <span>remaining</span>
                      <span className={cn('num font-semibold tabular-nums', urgencyStyles.text)}>
                        {formatDuration(remainingMs)}
                      </span>
                    </>
                  )}
                </span>
              </span>
            </button>

            <div className="flex shrink-0 items-center gap-1.5">
              {!isStarting && (
                <>
                  <button
                    onClick={copy}
                    className="hidden h-8 w-8 place-items-center rounded-lg text-night-text/70 transition-colors hover:bg-night-raised hover:text-white sm:grid"
                    aria-label="คัดลอกลิงก์"
                    title="คัดลอกลิงก์"
                  >
                    {copied ? <Check className="h-4 w-4 text-acid" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <a
                    href={activeInstance.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm bg-acid text-acid-ink hover:bg-acid-deep"
                  >
                    เปิด lab
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </>
              )}
              <Link
                to={`/labs/${activeInstance.labId}`}
                className="hidden rounded-lg px-2 py-1.5 text-xs font-medium text-night-text/70 transition-colors hover:bg-night-raised hover:text-white lg:block"
              >
                รายละเอียด
              </Link>
              <button
                onClick={stop}
                disabled={stopping}
                className="grid h-8 w-8 place-items-center rounded-lg text-night-text/50 transition-colors hover:bg-ember/15 hover:text-ember disabled:opacity-40"
                aria-label="หยุดด่าน"
                title="หยุดด่าน"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            </div>
          </div>

          {!minimized && !isStarting && (
            <div className="flex items-center gap-2 border-t border-night-line/70 px-3 py-2">
              <span className="font-mono text-[10px] text-night-text/40">target</span>
              <a
                href={activeInstance.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate font-mono text-[11px] text-night-text/80 hover:text-acid hover:underline"
              >
                {activeInstance.url}
              </a>
              {activeInstance.lab?.difficulty && (
                <span className="font-mono text-[10px] text-night-text/40">
                  {DIFFICULTY[activeInstance.lab.difficulty]?.label}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {confirmDialog}
    </>
  );
}
