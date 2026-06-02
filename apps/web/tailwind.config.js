/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark:    { DEFAULT: '#0d1117', card: '#1d1d1f' },
        brand:   { DEFAULT: '#6366f1', light: '#a5b4fc' },
        teal:    { DEFAULT: '#00c9a7' },
        success: { DEFAULT: '#34c759' },
        warning: { DEFAULT: '#ff9f0a' },
      },
      borderRadius: {
        card: '22px',
        pill: '980px',
      },
      boxShadow: {
        soft:        '0 8px 30px rgba(0,0,0,0.06)',
        card:        '0 16px 40px rgba(0,0,0,0.08)',
        'card-dark': '0 20px 48px rgba(0,0,0,0.3)',
      },
      animation: {
        'drift-a':    'driftA 14s ease-in-out infinite alternate',
        'drift-b':    'driftB 18s ease-in-out infinite alternate',
        'live-pulse': 'livePulse 2s ease-out infinite',
        'fade-up':    'fadeUp 0.8s ease both',
        'count-up':   'countUp 1.2s ease both',
        'breathe':    'breathe 6s ease-in-out infinite alternate',
        'spin-slow':  'spin 20s linear infinite',
        'pending':    'pendingPulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
