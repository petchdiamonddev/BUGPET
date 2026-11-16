/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#10b981', // Emerald 500
          hover: '#059669',
          foreground: '#ffffff',
        },
        cyber: {
          dark: '#080c14',
          card: '#0f172a',
          cardHover: '#17233d',
          border: '#1e293b',
          accent: '#06b6d4',
          glow: '#10b981',
        },
      },
    },
  },
  plugins: [],
}
