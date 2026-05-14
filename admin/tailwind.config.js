/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        peach: '#E8A1A3',
        'rose-gray': '#f3e7e6',
        'deep-black': '#2b2b2b',
        carbon: '#555555',
      },
      fontFamily: {
        serif: ['"Playfair Display"', '"Noto Serif SC"', 'serif'],
      },
      borderRadius: {
        pill: '24px',
      },
      boxShadow: {
        glass: '0 10px 40px rgba(210, 180, 175, 0.15)',
        'glass-lg': '0 20px 60px rgba(210, 180, 175, 0.2)',
        peach: '0 8px 25px rgba(232, 161, 163, 0.35)',
      },
      keyframes: {
        'page-enter': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'page-enter': 'page-enter 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
