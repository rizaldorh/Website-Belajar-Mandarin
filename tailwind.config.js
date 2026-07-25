/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pos: {
          noun: '#5EEAD4',
          verb: '#FDBA74',
          adj: '#86EFAC',
          adv: '#FDE047',
          pron: '#93C5FD',
          propn: '#C4B5FD',
          particle: '#F9A8D4',
          numeral: '#FDE047',
          function: '#D1D5DB',
        },
        hsk: {
          1: '#BBF7D0',
          2: '#FDE68A',
          3: '#FED7AA',
          4: '#FECACA',
          5: '#DDD6FE',
          6: '#FBCFE8',
          none: '#E5E7EB',
        },
      },
    },
  },
  plugins: [],
};
