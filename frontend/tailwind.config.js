/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#eef1f4',
          soft: '#e6eaef',
          raised: '#ffffff',
          line: '#d7dde5',
          strong: '#c3cbd6',
        },
        ink: {
          DEFAULT: '#1b212b',
          soft: '#2e3642',
          muted: '#5c6775',
          faint: '#8b95a3',
        },
        acid: {
          DEFAULT: '#1f4e8c',
          deep: '#173b6a',
          ink: '#ffffff',
        },
        ember: {
          DEFAULT: '#c2410c',
          soft: '#fde8df',
          deep: '#9a3412',
        },
        moss: {
          DEFAULT: '#1f7a4d',
          soft: '#e5f3eb',
          deep: '#145c38',
        },
        plum: {
          DEFAULT: '#5b4b8a',
          soft: '#eeeaf6',
        },
        // Terminal surfaces for lab consoles & code-ish blocks.
        night: {
          DEFAULT: '#16171a',
          soft: '#1e2024',
          raised: '#26282e',
          line: '#34373f',
          text: '#d9d6cf',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Thai"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"IBM Plex Sans Thai"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        card: '6px',
        panel: '6px',
      },
      boxShadow: {
        card: 'none',
        lift: '0 8px 24px rgba(20, 28, 40, 0.12)',
        inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(.96) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.15' },
        },
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(47, 122, 88, .45)' },
          '70%': { boxShadow: '0 0 0 7px rgba(47, 122, 88, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(47, 122, 88, 0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .35s cubic-bezier(.2,.7,.3,1) both',
        'fade-in': 'fade-in .25s ease-out both',
        'pop-in': 'pop-in .25s cubic-bezier(.2,.7,.3,1) both',
        marquee: 'marquee 40s linear infinite',
        blink: 'blink 1.1s steps(2, start) infinite',
        'pulse-ring': 'pulseRing 2s ease-out infinite',
        shimmer: 'shimmer 1.6s infinite',
      },
      transitionTimingFunction: {
        snap: 'cubic-bezier(.2,.7,.3,1)',
      },
    },
  },
  plugins: [],
};
