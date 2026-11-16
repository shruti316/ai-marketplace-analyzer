/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
          low: '#4D7C5B',
          'low-bg': '#EEF6F0',
          'low-border': '#C3DFCA',
          moderate: '#C67D3B',
          'moderate-bg': '#FDF4EB',
          'moderate-border': '#F3D4B6',
          elevated: '#B84A4A',
          'elevated-bg': '#FBECEC',
          'elevated-border': '#F3BFBF',
          sparse: '#64748B',
          'sparse-bg': '#F1F5F9',
          'sparse-border': '#CBD5E1',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'card': '14px',
        'modal': '18px',
      },
      boxShadow: {
        'soft': '0 2px 8px -1px rgba(13, 27, 42, 0.05), 0 1px 3px -1px rgba(13, 27, 42, 0.03)',
        'soft-md': '0 4px 16px -2px rgba(13, 27, 42, 0.08), 0 2px 6px -2px rgba(13, 27, 42, 0.04)',
        'soft-lg': '0 10px 25px -3px rgba(13, 27, 42, 0.1), 0 4px 10px -4px rgba(13, 27, 42, 0.05)',
      }
    },
  },
  plugins: [],
}
