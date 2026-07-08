/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#FF6B35',
      },
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(41,33,26,0.04), 0 6px 20px -6px rgba(41,33,26,0.08)',
        cardHover: '0 4px 10px rgba(41,33,26,0.05), 0 14px 32px -8px rgba(41,33,26,0.12)',
        warm: '0 12px 32px -6px rgba(255,107,53,0.28)',
      },
    },
  },
  plugins: [],
}
