import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/format';

/**
 * The logo "bug" mark drawn large as hero art: concentric rings, a crosshair,
 * a dashed orbit — a radar/target metaphor without a neon glow.
 */
export function HeroArt({ className }) {
  return (
    <svg viewBox="0 0 360 360" className={cn('h-full w-full', className)} fill="none" aria-hidden>
      <defs>
        <pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="1.2" cy="1.2" r="1.2" fill="#191818" fillOpacity="0.12" />
        </pattern>
        <radialGradient id="halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D5F24A" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#D5F24A" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="180" cy="180" r="168" fill="url(#dots)" />
      <circle cx="180" cy="180" r="132" stroke="#191818" strokeOpacity="0.14" strokeDasharray="3 7" />
      <circle cx="180" cy="180" r="96" stroke="#191818" strokeOpacity="0.2" />
      <circle cx="180" cy="180" r="64" fill="url(#halo)" />

      <path d="M180 22v28M180 310v28M22 180h28M310 180h28" stroke="#191818" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.55" />
      <path d="M180 22v28M180 310v28M22 180h28M310 180h28" stroke="#191818" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.55" transform="rotate(45 180 180)" />

      {/* bug body */}
      <g transform="translate(180 180)">
        <path d="M-46-26h92l-17 29h-58l-17-29Z" fill="#191818" />
        <path d="M-30-22h60l-10 21h-40l-10-21Z" fill="#D5F24A" />
        <path d="M-25 7h50v24a25 25 0 0 1-50 0V7Z" fill="#D5F24A" />
        <path d="M-25 15h-20m90 0h-20M-21 33l-17 13M21 33l17 13" stroke="#191818" strokeWidth="4" strokeLinecap="round" />
        <circle cx="0" cy="52" r="5" fill="#FF5C2B" />
        <circle cx="-10" cy="2" r="3.4" fill="#191818" />
        <circle cx="10" cy="2" r="3.4" fill="#191818" />
      </g>

      <g fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#6F6A62">
        <text x="150" y="14">00:00</text>
        <text x="318" y="184">E</text>
        <text x="150" y="356">TIMEOUT</text>
      </g>
      <circle cx="298" cy="96" r="4" fill="#FF5C2B" />
      <circle cx="298" cy="96" r="9" stroke="#FF5C2B" strokeOpacity="0.35" strokeDasharray="2 3" />
    </svg>
  );
}

/** Hero block for the home page. */
export default function Hero({ stats, statsLoading }) {
  const { user } = useAuth();

  return (
    <section className="relative overflow-hidden rounded-panel border border-paper-line bg-paper-raised">
      <div className="pointer-events-none absolute -right-16 -top-16 hidden h-[360px] w-[360px] opacity-[0.9] lg:block">
        <HeroArt />
      </div>

      <div className="relative grid gap-6 p-6 sm:p-8 lg:max-w-[62%] lg:p-10">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-paper-strong bg-paper-soft px-2.5 py-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-moss" />
          <span className="hidden font-mono text-2xs uppercase tracking-[0.16em] text-ink-muted sm:inline">
            isolated containers · targets live now
          </span>
          <span className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-muted sm:hidden">
            isolated containers
          </span>
        </div>

        <h1 className="text-balance font-display text-[34px] font-bold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[42px] lg:text-[46px]">
          ซ้อมเจาะระบบ
          <br />
          บนสนามจริง
          <span className="ml-2 inline-block align-middle">
            <span className="inline-flex h-[1.05em] w-[2.1em] items-center rounded-lg bg-night px-2 align-middle">
              <span className="font-mono text-[0.42em] font-medium tracking-tight text-acid">
                FLAG<span className="animate-blink">_</span>
              </span>
            </span>
          </span>
        </h1>

        <p className="max-w-xl text-pretty text-[15px] leading-relaxed text-ink-muted">
          แต่ละด่านคือเว็บแอปที่มีช่องโหว่จริง รันในคอนเทนเนอร์แยกเฉพาะคุณ เปิด URL ขึ้นมาแล้วเริ่มโจมตีได้ทันที —
          ไม่ต้องติดตั้งอะไร ไม่ต้องรอคิว และไม่มีทางกระทบผู้เล่นคนอื่น
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/labs" className="btn-primary btn-lg">
            เริ่มทำด่าน
            <ArrowRight className="h-4 w-4" />
          </Link>
          {!user && (
            <Link to="/register" className="btn-ghost btn-lg">
              สมัครฟรี
            </Link>
          )}
          {user && (
            <Link to="/leaderboard" className="btn-ghost btn-lg">
              ดูอันดับ
            </Link>
          )}
        </div>

        <dl className="grid max-w-lg grid-cols-3 gap-3 border-t border-paper-line pt-4">
          {[
            { label: 'ด่านที่เปิดอยู่', value: stats?.activeLabs, suffix: 'labs' },
            { label: 'ผู้เล่นในระบบ', value: stats?.totalPlayers, suffix: 'users' },
            { label: 'สเปกที่ถูกเจาะ', value: stats?.totalSolves, suffix: 'solved' },
          ].map((s) => (
            <div key={s.label}>
              <dd className="num font-display text-2xl font-bold text-ink">
                {statsLoading ? <span className="skeleton inline-block h-6 w-10 align-middle" /> : (s.value ?? 0)}
              </dd>
              <dt className="mt-0.5 text-2xs text-ink-muted">
                {s.label} <span className="font-mono text-ink-faint">{s.suffix}</span>
              </dt>
            </div>
          ))}
        </dl>
      </div>

      {/* Bottom ticker strip */}
      <div className="flex items-center gap-3 border-t border-paper-line bg-paper-soft px-6 py-2">
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">stack</span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-ink-muted">
          <span>traefik · wildcard routing</span>
          <span className="text-ink-faint">/</span>
          <span>bullmq · lifecycle jobs</span>
          <span className="text-ink-faint">/</span>
          <span>docker · cap-drop, no-new-privileges</span>
        </div>
      </div>
    </section>
  );
}
