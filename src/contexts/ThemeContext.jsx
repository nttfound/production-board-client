import React, { createContext, useContext, useEffect, useState } from 'react';

// ─────────────────────────────────────────────
//  TOKENS — edite aqui para mudar o visual todo
// ─────────────────────────────────────────────
const THEMES = {
  dark: {
    // Backgrounds
    bgApp:        '#0a0a0a',
    bgSurface:    '#0e0e0e',
    bgSurface1:   '#111111',
    bgSurface2:   '#141414',
    bgSurface3:   '#1a1a1a',
    bgInput:      '#0e0e0e',
    bgCard:       '#111111',
    bgOverlay:    'rgba(0,0,0,0.75)',

    // Borders
    borderDefault: '#1e1e1e',
    borderLight:   '#2a2a2a',
    borderAccent:  '#333333',

    // Text
    textPrimary:   '#e8e8e8',
    textSecondary: '#888888',
    textMuted:     '#555555',
    textFaint:     '#333333',
    textDisabled:  '#2a2a2a',

    // Accent (brand)
    accentBlue:    '#3b82f6',
    accentBlueDim: '#2563eb',
    accentOrange:  '#F75003',

    // Status colors (fixos — independem de tema)
    statusGreen:   '#22c55e',
    statusRed:     '#ef4444',
    statusYellow:  '#f59e0b',
    statusPurple:  '#7c3aed',

    // Service colors
    corte:    '#06b6d4',
    dobra:    '#8b5cf6',
    maoObra:  '#f59e0b',
    calandra: '#7148B3',
    urgente:  '#99582a',
    carga:    '#0096c7',
    cargaitapira:  '#84a98c',

    // Misc
    scrollbar:      '#2a2a2a',
    scrollbarHover: '#3a3a3a',
    gridLine:       'rgba(255,255,255,0.025)',

    // Shadows
    shadowCard:      '0 2px 12px rgba(0,0,0,0.5)',
    shadowCardHover: '0 8px 28px rgba(0,0,0,0.65)',
    shadowModal:     '0 24px 80px rgba(0,0,0,0.8)',
  },

  light: {
    // Backgrounds — tom quente levemente acinzentado, sem branco puro
    bgApp:        '#ebebed',
    bgSurface:    '#f2f2f4',
    bgSurface1:   '#f7f7f9',
    bgSurface2:   '#e8e8eb',
    bgSurface3:   '#dddde1',
    bgInput:      '#f7f7f9',
    bgCard:       '#f7f7f9',
    bgOverlay:    'rgba(0,0,0,0.45)',

    // Borders — mais definidas para dar estrutura
    borderDefault: '#d2d2d8',
    borderLight:   '#c4c4cc',
    borderAccent:  '#9494a0',

    // Text — contraste firme
    textPrimary:   '#1a1a22',
    textSecondary: '#46464f',
    textMuted:     '#8a8a96',
    textFaint:     '#c0c0cc',
    textDisabled:  '#d8d8e0',

    // Accent (brand)
    accentBlue:    '#2563eb',
    accentBlueDim: '#1d4ed8',
    accentOrange:  '#F75003',

    // Status colors
    statusGreen:   '#16a34a',
    statusRed:     '#dc2626',
    statusYellow:  '#d97706',
    statusPurple:  '#7c3aed',

    // Service colors
    corte:    '#0891b2',
    dobra:    '#7c3aed',
    maoObra:  '#d97706',
    calandra: '#16a34a',
    urgente:  '#dc2626',
    carga:    '#ea580c',

    // Misc
    scrollbar:      '#c4c4cc',
    scrollbarHover: '#9494a0',
    gridLine:       'rgba(0,0,0,0.055)',

    // Shadows — mais presentes para separar camadas
    shadowCard:      '0 1px 3px rgba(0,0,0,0.10), 0 3px 14px rgba(0,0,0,0.08)',
    shadowCardHover: '0 4px 22px rgba(0,0,0,0.15)',
    shadowModal:     '0 24px 80px rgba(0,0,0,0.28)',
  },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('theme') || 'dark');
  const tokens = THEMES[mode] || THEMES.dark;

  // Injeta CSS variables no :root
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(tokens).forEach(([key, val]) => {
      root.style.setProperty(`--${camel2kebab(key)}`, val);
    });
    root.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);

    // body background + color
    document.body.style.background = tokens.bgApp;
    document.body.style.color = tokens.textPrimary;
  }, [mode, tokens]);

  const toggle = () => setMode(m => m === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ mode, tokens, toggle, isDark: mode === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve estar dentro de ThemeProvider');
  return ctx;
}

// camelCase → kebab-case
function camel2kebab(str) {
  return str.replace(/([A-Z])/g, m => `-${m.toLowerCase()}`);
}

export { THEMES };
