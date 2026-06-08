/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface:  { DEFAULT: '#0e0e0e', 1: '#141414', 2: '#1a1a1a', 3: '#222222' },
        border:   { DEFAULT: '#1e1e1e', light: '#2a2a2a', accent: '#333' },
        text:     { primary: '#e8e8e8', secondary: '#888', muted: '#444' },
        accent:   { blue: '#3b82f6', orange: '#F75003' },
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        tag: '8px',
      },
      boxShadow: {
        card:        '0 1px 3px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)',
        'card-hover':'0 4px 20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
        modal:       '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
        tag:         '0 1px 3px rgba(0,0,0,0.4)',
      },
      animation: {
        'fade-in':    'fadeIn 0.18s ease',
        'slide-up':   'slideUp 0.22s ease',
        'scale-in':   'scaleIn 0.18s ease',
        'pulse-soft': 'pulseSoft 2.5s ease-in-out infinite',
        'shimmer':    'shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 },                              to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        scaleIn:   { from: { opacity: 0, transform: 'scale(0.96)' },     to: { opacity: 1, transform: 'scale(1)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
};
