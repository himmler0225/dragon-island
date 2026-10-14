/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#ffcc00',
          dark: '#e6b800',
          light: '#ffdb4d',
        },
        primary: {
          DEFAULT: '#1a73e8',
          dark: '#1557b0',
          light: '#4a9eff',
        },
        dark: {
          DEFAULT: '#0b1218',
          card: '#1a252f',
        },
      },
      animation: {
        'float-cloud': 'float-cloud 60s linear infinite',
      },
      keyframes: {
        'float-cloud': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(calc(100vw + 200px))' },
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
}
