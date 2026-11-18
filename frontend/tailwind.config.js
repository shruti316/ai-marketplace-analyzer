/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#0B0D14',
        surface: {
          DEFAULT: '#111522',
          card: '#121624',
          raised: '#181D2E',
          elevated: '#1E2438',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        brand: {
          navy: '#0D1B2A',
          'navy-surface': '#15263A',
          'navy-light': '#1C324D',
          teal: '#3D7584',
          'teal-hover': '#32606D',
          'teal-light': '#EBF2F4',
          blue: '#89BBBE',
          'blue-light': '#F0F7F8',
          mist: '#E8EFF0',
          'mist-border': '#D8E3E5',
          ivory: '#F6EFE3',
          'ivory-light': '#FAF7F2',
          'ivory-surface': '#FFFFFF',
          sage: '#A3B18A',
          'sage-hover': '#93A17B',
          'sage-light': '#F0F4EC',
          lavender: '#B8B2D8',
          'lavender-light': '#F3F1F9',
        },
        risk: {
          low: '#10B981',
          'low-bg': 'rgba(16, 185, 129, 0.1)',
          'low-border': 'rgba(16, 185, 129, 0.25)',
          moderate: '#F59E0B',
          'moderate-bg': 'rgba(245, 158, 11, 0.1)',
          'moderate-border': 'rgba(245, 158, 11, 0.25)',
          elevated: '#F43F5E',
          'elevated-bg': 'rgba(244, 63, 94, 0.1)',
          'elevated-border': 'rgba(244, 63, 94, 0.25)',
          sparse: '#64748B',
          'sparse-bg': 'rgba(100, 116, 139, 0.1)',
          'sparse-border': 'rgba(100, 116, 139, 0.25)',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'card': '14px',
        'modal': '18px',
      },
      boxShadow: {
        'soft': '0 2px 8px -1px rgba(0, 0, 0, 0.3), 0 1px 3px -1px rgba(0, 0, 0, 0.2)',
        'soft-md': '0 4px 16px -2px rgba(0, 0, 0, 0.4), 0 2px 6px -2px rgba(0, 0, 0, 0.3)',
        'soft-lg': '0 10px 25px -3px rgba(0, 0, 0, 0.5), 0 4px 10px -4px rgba(0, 0, 0, 0.4)',
        'glow-indigo': '0 0 25px -5px rgba(99, 102, 241, 0.25)',
      }
    },
  },
  plugins: [],
}
