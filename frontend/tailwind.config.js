/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Puro Soul brand blue (purosoul.in — theme palette: #145AE2, hover #124cbf) */
        primary: {
          50: '#eff5ff',
          100: '#dbe8fe',
          200: '#bfd7fe',
          300: '#93bbfd',
          400: '#578ff2',
          500: '#3872ea',
          600: '#145ae2',
          700: '#124cbf',
          800: '#143e96',
          900: '#16367a',
          DEFAULT: '#145ae2',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(17 21 24 / 0.06), 0 1px 2px -1px rgb(17 21 24 / 0.06)',
      },
    },
  },
  plugins: [],
};
