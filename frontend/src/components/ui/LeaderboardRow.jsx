import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, Terminal } from 'lucide-react';
import { cn, pointsLabel, relativeTime } from '../../lib/format';
import { Avatar } from './Primitives';
import { BadgeMedallion } from './BadgeMedallion';

const MEDAL = {
  1: { label: '01', className: 'bg-acid text-acid-ink border-acid-deep/50' },
  2: { label: '02', className: 'bg-paper-raised text-ink border-paper-strong' },
  3: { label: '03', className: 'bg-[#f7ecdf] text-[#8a5527] border-[#d9b68f]' },
};

export function RankBadge({ rank, className }) {
  const medal = MEDAL[rank];
  return (
    <span
      className={cn(
        'num inline-grid h-7 w-7 place-items-center rounded-lg border font-mono text-[11px] font-bold',
        medal ? medal.className : 'border-transparent text-ink-faint',
        className
      )}
    >
      {medal ? medal.label : String(rank).padStart(2, '0')}
    </span>
  );
}

/** Dense leaderboard row used by the leaderboard page and side rails. */
export default function LeaderboardRow({ entry, isMe, showBadges = true }) {
  return (
    <Link
      to={`/players/${entry.id}`}
      className={cn(
        'group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-paper-soft/80',
        isMe && 'bg-acid/15 hover:bg-acid/25'
      )}
    >
      <RankBadge rank={entry.rank} />
      <Avatar name={entry.username} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-ink">{entry.username}</span>
          {isMe && <span className="chip chip-acid px-1.5 py-0 text-[9px]">YOU</span>}
          {entry.rank === 1 && <Crown className="h-3.5 w-3.5 text-[#b8940a]" />}
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-ink-faint">
          <span className="inline-flex items-center gap-1">
            <Terminal className="h-3 w-3" />
            {entry.solvesCount}
          </span>
          {entry.lastSolveAt && <span>· {relativeTime(entry.lastSolveAt)}</span>}
        </div>
      </div>

      {showBadges && entry.badges?.length > 0 && (
        <div className="hidden items-center -space-x-1.5 sm:flex">
          {entry.badges.slice(0, 3).map((b) => (
            <BadgeMedallion key={b.id} badge={b} size="sm" className="h-6 w-6 rounded-lg ring-2 ring-paper-raised" />
          ))}
          {entry.badges.length > 3 && (
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-paper-soft text-[9px] font-bold text-ink-muted ring-2 ring-paper-raised">
              +{entry.badges.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="num shrink-0 text-right">
        <div className="font-mono text-sm font-semibold text-ink">{pointsLabel(entry.points)}</div>
        <div className="font-mono text-[10px] text-ink-faint">pts</div>
      </div>
    </Link>
  );
}
