/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        stone: {
          50:  '#faf9f7',
          100: '#f5f4f0',
          200: '#e8e5e0',
          300: '#d6d2ca',
          400: '#b8b2a8',
          500: '#9a9288',
          600: '#7c7268',
          700: '#5e5650',
          800: '#403c38',
          900: '#1c1917',
        },
        ember: {
          50:  '#fff4ee',
          100: '#ffe6d5',
          200: '#ffc9a8',
          300: '#ffa070',
          400: '#ff7040',
          500: '#f54f1a',
          600: '#c2410c',
          700: '#9a3208',
          800: '#7c2a0a',
          900: '#65230d',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
