/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Base palette ──────────────────────────────────────
        surface:  { DEFAULT: '#141414', 1: '#1c1c1c', 2: '#242424', 3: '#2e2e2e' },
        border:   { DEFAULT: '#2a2a2a', light: '#3a3a3a' },
        text:     { primary: '#f0f0f0', secondary: '#8a8a8a', muted: '#555' },

        // ── Status colors ─────────────────────────────────────
        status: {
          pending:   '#6b7280',  // gray
          producing: '#3b82f6',  // blue
          ready:     '#22c55e',  // green
          nomaterial:'#ef4444',  // red
          waiting:   '#eab308',  // yellow
          scheduled: '#a855f7',  // purple
        },
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card:        '0 2px 8px rgba(0,0,0,0.4)',
        'card-hover':'0 8px 24px rgba(0,0,0,0.6)',
        modal:       '0 24px 64px rgba(0,0,0,0.7)',
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease',
        'slide-up':   'slideUp 0.25s ease',
        'scale-in':   'scaleIn 0.2s ease',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 },                         to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        scaleIn:   { from: { opacity: 0, transform: 'scale(0.95)' },      to: { opacity: 1, transform: 'scale(1)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
      },
    },
  },
  plugins: [],
};
