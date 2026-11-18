import React from 'react';
import {
  Bug,
  Droplet,
  Terminal,
  Crown,
  Skull,
  Layers,
  Flame,
  Medal,
  Shield,
} from 'lucide-react';
import { cn } from '../../lib/format';

const ICONS = {
  droplet: Droplet,
  bug: Bug,
  terminal: Terminal,
  crown: Crown,
  skull: Skull,
  layers: Layers,
  flame: Flame,
};

const TIER_STYLE = {
  BRONZE: 'from-[#f7ecdf] to-[#efdcc6] text-[#8a5527] border-[#d9b68f]',
  SILVER: 'from-[#f4f5f7] to-[#e4e7eb] text-[#4c5864] border-[#c3cad2]',
  GOLD: 'from-[#fdf7dd] to-[#f6e6b4] text-[#8a6a08] border-[#e2c56e]',
};

/**
 * Badge medallion. Supports both the semantic icon names stored in DB
 * (`terminal`, `crown`…) and legacy emoji values from older seeds.
 */
export function BadgeMedallion({ badge, earned = true, size = 'md', showLock = false, className }) {
  const Icon = ICONS[badge?.icon] ?? Medal;
  const isEmoji = Boolean(badge?.icon) && !ICONS[badge.icon];
  const sizes = {
    sm: { box: 'h-9 w-9', icon: 'h-4 w-4', emoji: 'text-base' },
    md: { box: 'h-12 w-12', icon: 'h-5 w-5', emoji: 'text-2xl' },
    lg: { box: 'h-16 w-16', icon: 'h-7 w-7', emoji: 'text-3xl' },
  }[size];

  const tier = earned ? TIER_STYLE[badge?.tier] ?? TIER_STYLE.BRONZE : 'from-paper-soft to-paper-line text-ink-faint border-paper-strong';

  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center rounded-2xl border bg-gradient-to-br shadow-[inset_0_1px_0_rgba(255,255,255,.7)]',
        tier,
        sizes.box,
        !earned && 'opacity-60 grayscale',
        className
      )}
      title={badge?.name}
    >
      {isEmoji ? <span className={sizes.emoji}>{badge.icon}</span> : <Icon className={sizes.icon} strokeWidth={2} />}
      {showLock && !earned && (
        <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border border-paper-strong bg-paper-raised">
          <Shield className="h-2.5 w-2.5 text-ink-faint" />
        </span>
      )}
    </span>
  );
}
