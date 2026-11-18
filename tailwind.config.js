/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: { 50: '#FFFDF8', 100: '#FBF8F2', 200: '#F4EEE2', 300: '#E9E0CF', 400: '#D9CDB6' },
        gold: { 100: '#F6EEDB', 200: '#EBDDB9', 300: '#DEC892', 400: '#D0B474', 500: '#C2A05A', 600: '#A8843F', 700: '#86682F', 800: '#644D22' },
        ink: { DEFAULT: '#2B2622', soft: '#5C544C', mute: '#8A8177' },
        rosewood: '#9B3B3B',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        script: ['"Great Vibes"', 'cursive'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(70,52,20,.05), 0 10px 28px -12px rgba(70,52,20,.16)',
        card: '0 2px 4px rgba(70,52,20,.08), 0 22px 44px -20px rgba(70,52,20,.34)',
        lift: '0 4px 10px rgba(70,52,20,.08), 0 32px 60px -24px rgba(70,52,20,.4)',
      },
      keyframes: {
        rise: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        pop: { from: { opacity: '0', transform: 'scale(.96)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { rise: 'rise .45s cubic-bezier(.2,.7,.2,1) both', fade: 'fade .25s ease both', pop: 'pop .22s cubic-bezier(.2,.7,.2,1) both' },
    },
  },
  plugins: [],
};
