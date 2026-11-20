import React from 'react';
import { cn, DIFFICULTY, TIER } from '../../lib/format';

/* ------------------------------- Button ------------------------------- */
const VARIANTS = {
  primary: 'btn-primary',
  accent: 'btn-accent',
  ghost: 'btn-ghost',
  soft: 'btn-soft',
  danger: 'btn-danger',
};

export function Button({ variant = 'primary', size, className, loading, children, icon: Icon, ...props }) {
  return (
    <button
      className={cn(VARIANTS[variant] ?? VARIANTS.primary, size === 'sm' && 'btn-sm', size === 'lg' && 'btn-lg', className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : Icon ? <Icon className="h-4 w-4" strokeWidth={2.2} /> : null}
      {children}
    </button>
  );
}

/* ------------------------------ Icon alias ---------------------------- */
export function Icon({ as: As, className, ...props }) {
  if (!As) return null;
  return <As className={className} {...props} />;
}
/* ------------------------------- Spinner ------------------------------ */
export function Spinner({ className }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------- Badges ------------------------------- */
export function DifficultyBadge({ difficulty, showEn = true, className }) {
  const meta = DIFFICULTY[difficulty] ?? DIFFICULTY.EASY;
  const tones = {
    moss: 'border-moss/30 bg-moss-soft text-moss-deep',
    ember: 'border-ember/25 bg-ember-soft text-ember-deep',
    plum: 'border-plum/25 bg-plum-soft text-plum',
  };
  const bars = { EASY: 1, MEDIUM: 2, HARD: 3 }[difficulty] ?? 1;

  return (
    <span className={cn('chip', tones[meta.tone], className)}>
      <span className="flex items-end gap-[2px]" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn('w-[3px] rounded-sm bg-current', i < bars ? 'opacity-100' : 'opacity-25')}
            style={{ height: 5 + i * 3 }}
          />
        ))}
      </span>
      {meta.label}
      {showEn && <span className="opacity-60">{meta.en}</span>}
    </span>
  );
}

export function TierBadge({ tier = 'BRONZE', children, className }) {
  const meta = TIER[tier] ?? TIER.BRONZE;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ring-1',
        meta.bg,
        meta.text,
        meta.ring,
        className
      )}
    >
      {children ?? meta.label}
    </span>
  );
}

export function StatusDot({ tone = 'moss', pulse = false, className }) {
  const tones = {
    moss: 'bg-moss',
    ember: 'bg-ember',
    ink: 'bg-ink',
    acid: 'bg-acid-deep',
    muted: 'bg-ink-faint',
  };
  return (
    <span className={cn('relative inline-flex h-2 w-2', className)}>
      <span className={cn('absolute inset-0 rounded-full', tones[tone], pulse && 'animate-pulse-ring')} />
    </span>
  );
}

/* ------------------------- Avatar / Identity -------------------------- */
const AVATAR_PALETTE = ['#2f7a58', '#6b4ee6', '#c93c0f', '#1f6f8b', '#8a6a08', '#8a3a6b'];

export const avatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
};

export function Avatar({ name = '?', size = 40, className, ring = false }) {
  const bg = avatarColor(name);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-xl font-display font-semibold text-white',
        ring && 'ring-2 ring-paper-raised',
        className
      )}
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.38 }}
      aria-hidden
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

/* -------------------------------- Card -------------------------------- */
export function Card({ as: Tag = 'div', className, children, ...props }) {
  return (
    <Tag className={cn('card', className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ eyebrow, title, description, action, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-paper-line px-4 py-3', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-0.5">{eyebrow}</div>}
        <h3 className="truncate font-display text-[15px] font-semibold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------- Meters ------------------------------- */
export function ProgressRing({ value = 0, size = 64, stroke = 6, label, className }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#d7dde5" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#191818"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (clamped / 100) * circumference}
          style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.2,.7,.3,1)' }}
        />
      </svg>
      <span className="absolute font-mono text-xs font-semibold text-ink">{label ?? `${Math.round(clamped)}%`}</span>
    </div>
  );
}

export function Meter({ value = 0, tone = 'ink', className, label }) {
  const tones = { ink: 'bg-ink', acid: 'bg-acid-deep', ember: 'bg-ember', moss: 'bg-moss', plum: 'bg-plum' };
  return (
    <div className={cn('space-y-1', className)}>
      {label && <div className="flex justify-between text-2xs text-ink-muted">{label}</div>}
      <div className="h-1.5 overflow-hidden rounded-full bg-paper-line">
        <div
          className={cn('h-full rounded-full transition-[width] duration-700 ease-snap', tones[tone])}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------ Sparkline ----------------------------- */
export function Sparkline({ data = [], width = 120, height = 32, className }) {
  if (!data.length) return null;
  const max = Math.max(1, ...data);
  const step = width / Math.max(1, data.length - 1);
  const points = data.map((v, i) => `${i * step},${height - (v / max) * (height - 2) - 1}`).join(' ');
  return (
    <svg width={width} height={height} className={cn('overflow-visible', className)} aria-hidden>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------- Empty -------------------------------- */
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}>
      {Icon && (
        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-paper-strong bg-paper-soft text-ink-muted">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div>
        <p className="font-display text-[15px] font-semibold text-ink">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />;
}

/* ------------------------------- Field -------------------------------- */
export function Field({ label, hint, error, required, children, className, htmlFor }) {
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-ember">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-2xs font-medium text-ember-deep">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-2xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------ Segmented ----------------------------- */
export function Segmented({ options, value, onChange, size = 'md', className }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl border border-paper-line bg-paper-soft p-0.5',
        className
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-[10px] font-medium transition-all duration-150',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              active
                ? 'bg-paper-raised text-ink shadow-[0_1px_2px_rgba(25,24,24,0.08)]'
                : 'text-ink-muted hover:text-ink'
            )}
          >
            {opt.icon && <opt.icon className="mr-1 -mt-0.5 inline h-3.5 w-3.5" />}
            {opt.label}
            {opt.count !== undefined && (
              <span className={cn('ml-1.5 font-mono text-2xs', active ? 'text-ink-muted' : 'text-ink-faint')}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
