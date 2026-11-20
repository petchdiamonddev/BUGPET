import React from 'react';
import { BRAND } from '../../config/brand';

/**
 * Brand mark.
 *
 * The image is loaded from `frontend/public/logo.svg` — replace that file to
 * change the logo everywhere, no code change needed. The wordmark is rendered
 * as text so it also works when the image is missing (`onError` falls back to
 * the wordmark alone instead of a broken-image icon).
 *
 * Sizing: the image box is square; height 36px in the header reads well and
 * stays sharp because the SVG scales. Pass `size` to override (e.g. 28 in the
 * footer, 88 on the auth screen).
 */
export default function Logo({ compact = false, size = 36, showTagline = true, className = '' }) {
  const [imageOk, setImageOk] = React.useState(true);

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {imageOk && (
        <img
          src="/logo.svg"
          alt={`${BRAND.name} logo`}
          width={size}
          height={size}
          className="shrink-0 object-contain"
          style={{ width: size, height: size }}
          onError={() => setImageOk(false)}
        />
      )}

      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[17px] font-bold tracking-[-0.03em] text-ink">
            {BRAND.name}
          </span>
          {showTagline && (
            <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-ink-faint">
              {BRAND.tagline}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
