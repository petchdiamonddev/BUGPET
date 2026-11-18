import React from 'react';

/**
 * App wordmark. Monogram glyph + wordmark + a small version tag; the glyph is
 * a stylized bug/terminal hybrid drawn inline so it stays crisp at any size.
 */
export default function Logo({ compact = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-[11px] bg-night shadow-[0_2px_0_#000]">
        <svg viewBox="0 0 32 32" className="h-[22px] w-[22px]" fill="none" aria-hidden>
          <path d="M9 11h14l-2.6 4.6H11.6L9 11Z" fill="#D5F24A" />
          <path d="M12.4 16h7.2v3.4a3.6 3.6 0 0 1-7.2 0V16Z" fill="#D5F24A" />
          <path d="M12.4 17.6H9.5m13 0h-2.9M12.4 20.4l-2.4 1.8m9.6-1.8 2.4 1.8" stroke="#16171A" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-ember" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[17px] font-bold tracking-[-0.03em] text-ink">petbug</span>
          <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-ink-faint">lab platform</span>
        </span>
      )}
    </span>
  );
}
