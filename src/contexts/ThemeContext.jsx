import React, { createContext, useContext, useEffect, useState } from 'react';

//  TOKENS — edite aqui para mudar o visual todo
const THEMES = {
  dark: {
    // Backgrounds
    bgApp:        '#0c1420',
    bgSurface:    '#111b29',
    bgSurface1:   '#172436',
    bgSurface2:   '#1b2a3e',
    bgSurface3:   '#26374d',
    bgInput:      '#111b29',
    bgCard:       '#142033',
    bgOverlay:    'rgba(4,10,18,0.78)',

    // Borders
    borderDefault: '#26364b',
    borderLight:   '#344962',
    borderAccent:  '#4a6583',

    // Text
    textPrimary:   '#f1f5fa',
    textSecondary: '#aebdd0',
    textMuted:     '#8497ad',
    textFaint:     '#667b94',
    textDisabled:  '#4b5d73',

    // Accent (brand)
    accentBlue:    '#5b91fa',
    accentBlueDim: '#3974e8',
    accentOrange:  '#f29145',

    // Status colors (fixos — independem de tema)
    statusGreen:   '#40c98b',
    statusRed:     '#f47b78',
    statusYellow:  '#f3bd58',
    statusPurple:  '#a58cf2',

    // Service colors
    corte:    '#8ca4c1',
    dobra:    '#58c4a0',
    maoObra:  '#f3bd58',
    calandra: '#b292f4',
    urgente:  '#ff8b61',
    carga:    '#76c98f',
    cargaitapira:  '#e3c75f',

    // Misc
    scrollbar:      '#34465d',
    scrollbarHover: '#4e6580',
    gridLine:       'rgba(185,205,229,0.035)',

    // Shadows
    shadowCard:      '0 2px 8px rgba(3,10,20,0.22), 0 12px 30px rgba(3,10,20,0.12)',
    shadowCardHover: '0 12px 32px rgba(3,10,20,0.28)',
    shadowModal:     '0 24px 72px rgba(3,10,20,0.55)',
  },

  light: {
    // Backgrounds — tom quente levemente acinzentado, sem branco puro
    bgApp:        '#f2f5f9',
    bgSurface:    '#ffffff',
    bgSurface1:   '#ffffff',
    bgSurface2:   '#f2f5f9',
    bgSurface3:   '#e7edf5',
    bgInput:      '#ffffff',
    bgCard:       '#ffffff',
    bgOverlay:    'rgba(15,27,43,0.52)',

    // Borders — mais definidas para dar estrutura
    borderDefault: '#dce4ee',
    borderLight:   '#cbd6e4',
    borderAccent:  '#a6b7cc',

    // Text — contraste firme
    textPrimary:   '#182638',
    textSecondary: '#53647a',
    textMuted:     '#78899d',
    textFaint:     '#a4b0c0',
    textDisabled:  '#c7d0dc',

    // Accent (brand)
    accentBlue:    '#3168db',
    accentBlueDim: '#2454bd',
    accentOrange:  '#d86c22',

    // Status colors
    statusGreen:   '#16895c',
    statusRed:     '#c74545',
    statusYellow:  '#b97812',
    statusPurple:  '#704fc0',

    // Service colors
    corte:    '#52729a',
    dobra:    '#27856b',
    maoObra:  '#a96706',
    calandra: '#704fc0',
    urgente:  '#c24d22',
    carga:    '#328450',
    cargaitapira:  '#9b7b08',

    // Misc
    scrollbar:      '#cbd5e2',
    scrollbarHover: '#a8b6c8',
    gridLine:       'rgba(38,60,88,0.06)',

    // Shadows — mais presentes para separar camadas
    shadowCard:      '0 1px 2px rgba(24,38,56,0.04), 0 8px 24px rgba(24,38,56,0.06)',
    shadowCardHover: '0 14px 34px rgba(24,38,56,0.12)',
    shadowModal:     '0 24px 72px rgba(24,38,56,0.22)',
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
