/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#b9ccff',
          300: '#7a9eff',
          400: '#4070ee',
          500: '#1e4db7',
          600: '#153994',
          700: '#0f2a6e',
          800: '#0a1d4e',
          900: '#06112e',
          950: '#030a1f',
        },
        teal: {
          50: '#f0fafa',
          100: '#d0f1f1',
          200: '#a0e2e2',
          300: '#60cbcb',
          400: '#2aadad',
          500: '#1a8f8f',
          600: '#127070',
          700: '#0d5555',
          800: '#083a3a',
          900: '#042020',
        }
      }
    },
  },
  plugins: [],
}
