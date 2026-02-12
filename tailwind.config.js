/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Outfit"', '"Noto Sans Thai"', 'sans-serif'], // Fallback to Noto for Thai
        sans: ['"Noto Sans Thai"', 'sans-serif'],
        mono: ['"Inter"', '"Noto Sans Thai"', 'monospace'], // Fallback to Noto for Thai
      },
    },
  },
  plugins: [],
}