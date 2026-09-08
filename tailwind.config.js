/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          900: '#0b1f17',
          800: '#123527',
          700: '#1a4b37',
        },
      },
    },
  },
  plugins: [],
};
