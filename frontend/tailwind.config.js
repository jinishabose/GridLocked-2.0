/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#07111F',
          secondary: '#0D1B2A',
          tertiary: '#0F2033',
          card: '#0C1929',
          elevated: '#112235',
        },
        traffic: {
          blue: '#0F3D66',
          'blue-light': '#1A5A8A',
          'blue-bright': '#1E6FBF',
        },
        signal: {
          green: '#22C55E',
          'green-dim': '#16A34A',
          'green-muted': '#15803D',
        },
        amber: {
          warning: '#F59E0B',
          'warning-dim': '#D97706',
          'warning-muted': '#B45309',
        },
        traffic_red: {
          DEFAULT: '#EF4444',
          dim: '#DC2626',
          muted: '#B91C1C',
        },
        road: {
          gray: '#334155',
          'gray-light': '#475569',
          'gray-dark': '#1E293B',
        },
        accent: {
          cyan: '#06B6D4',
          'cyan-dim': '#0891B2',
          'cyan-muted': '#0E7490',
        },
        risk: {
          low: '#22C55E',
          medium: '#F59E0B',
          high: '#F97316',
          critical: '#EF4444',
        },
        // Light mode overrides
        light: {
          bg: '#F0F4F8',
          card: '#FFFFFF',
          border: '#CBD5E1',
          text: '#0F172A',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'kpi': ['30px', { lineHeight: '1', fontWeight: '700' }],
        'kpi-sm': ['24px', { lineHeight: '1', fontWeight: '700' }],
        'section': ['14px', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '0.05em' }],
        'table-header': ['11px', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '0.08em' }],
        'body': ['12px', { lineHeight: '1.5' }],
        'body-sm': ['11px', { lineHeight: '1.4' }],
        'map-label': ['11px', { lineHeight: '1.2' }],
      },
      spacing: {
        'sidebar': '220px',
        'sidebar-collapsed': '56px',
        'header': '48px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'blink': 'blink 1.5s ease-in-out infinite',
        'scan-line': 'scanLine 4s linear infinite',
      },
      keyframes: {
        slideInLeft: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      backgroundImage: {
        'grid-dark': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Cpath d='M0 0h32v32H0z' fill='none'/%3E%3Cpath d='M32 0H0v1h32zM0 0v32h1V0z' fill='%230F3D6622'/%3E%3C/svg%3E\")",
        'radial-glow': 'radial-gradient(ellipse at center, rgba(6,182,212,0.05) 0%, transparent 70%)',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.5), 0 0 0 1px rgba(6,182,212,0.15)',
        'kpi': '0 0 20px rgba(6,182,212,0.08)',
        'critical': '0 0 12px rgba(239,68,68,0.25)',
        'glow-cyan': '0 0 16px rgba(6,182,212,0.3)',
        'glow-green': '0 0 16px rgba(34,197,94,0.3)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.07)',
      },
    },
  },
  plugins: [],
};
