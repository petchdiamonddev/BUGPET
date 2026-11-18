/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paper & ink: warm neutrals instead of blue-grey slate.
        paper: {
          DEFAULT: '#f4f2ec',
          soft: '#efede6',
          raised: '#fbfaf7',
          line: '#e2ded3',
          strong: '#d5cfc1',
        },
        ink: {
          DEFAULT: '#191818',
          soft: '#3c3a37',
          muted: '#6f6a62',
          faint: '#9a948a',
        },
        acid: {
          DEFAULT: '#d5f24a',
          deep: '#b9d92f',
          ink: '#1c2408',
        },
        ember: {
          DEFAULT: '#ff5c2b',
          soft: '#ffe9e1',
          deep: '#c93c0f',
        },
        moss: {
          DEFAULT: '#2f7a58',
          soft: '#e3f1e9',
          deep: '#1f573d',
        },
        plum: {
          DEFAULT: '#6b4ee6',
          soft: '#ece7ff',
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
        display: ['"Anuphan"', '"IBM Plex Sans Thai"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        card: '14px',
        panel: '18px',
      },
      boxShadow: {
        card: '0 1px 0 rgba(25, 24, 24, 0.04), 0 8px 24px -18px rgba(25, 24, 24, 0.35)',
        lift: '0 2px 0 rgba(25, 24, 24, 0.05), 0 22px 40px -28px rgba(25, 24, 24, 0.55)',
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
