import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { cn, DIFFICULTY } from '../../lib/format';
import { DifficultyBadge } from './Primitives';

const ACCENT = {
  EASY: 'bg-moss',
  MEDIUM: 'bg-ember',
  HARD: 'bg-plum',
};

/**
 * Lab card designed as a "dossier": an accent spine by difficulty, a meta
 * row, the title, a clamped description, tags and a footer with stats. Solved
 * labs get a stamped look rather than a green pill.
 */
export default function LabCard({ lab, active = false, index = 0 }) {
  const solved = lab.isSolved;

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-card border border-paper-line bg-paper-raised shadow-card transition-all duration-200 ease-snap hover:-translate-y-[2px] hover:border-ink-faint hover:shadow-lift',
        active && 'border-moss/40 ring-1 ring-moss/25',
        solved && 'bg-paper-soft/60'
      )}
      style={{ animation: `fade-up .4s ${Math.min(index, 8) * 35}ms cubic-bezier(.2,.7,.3,1) both` }}
    >
      <span className={cn('absolute inset-y-0 left-0 w-[3px]', ACCENT[lab.difficulty] ?? ACCENT.EASY, solved && 'opacity-40')} />

      <div className="flex flex-1 flex-col gap-2.5 p-4 pl-[18px]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <DifficultyBadge difficulty={lab.difficulty} />
            {active && (
              <span className="chip border-moss/30 bg-moss-soft text-moss-deep">
                <span className="h-1.5 w-1.5 rounded-full bg-moss" />
                กำลังรัน
              </span>
            )}
          </div>
          <span className={cn('num font-mono text-sm font-semibold', solved ? 'text-ink-faint line-through' : 'text-ink')}>
            +{lab.points}
          </span>
        </div>

        <h3 className="font-display text-[15px] font-semibold leading-snug text-ink">
          {/* The card itself is clickable via the stretched overlay, but the
              visible link needs a focusable hit area of its own for keyboard. */}
          <Link
            to={`/labs/${lab.id}`}
            className="rounded-sm after:absolute after:inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {lab.title}
          </Link>
        </h3>

        <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
          {lab.shortDescription ?? lab.description}
        </p>

        {lab.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {lab.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-md bg-paper-soft px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                {tag}
              </span>
            ))}
            {lab.tags.length > 3 && (
              <span className="rounded-md px-1 py-0.5 font-mono text-[10px] text-ink-faint">+{lab.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-paper-line/80 px-4 py-2 pl-[18px] text-2xs text-ink-muted">
        <span className="flex items-center gap-2.5 font-mono">
          <span>{lab.solvesCount} solved</span>
          <span className="text-ink-faint">·</span>
          <span>{lab.timeoutMin}m</span>
        </span>

        {solved ? (
          <span className="inline-flex rotate-[-3deg] items-center gap-1 rounded border border-moss/40 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-moss">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            solved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-ink-soft transition-colors group-hover:text-ink">
            เปิดด่าน
            <ArrowUpRight className="h-3 w-3" />
          </span>
        )}
      </div>
    </article>
  );
}

export { DIFFICULTY };
