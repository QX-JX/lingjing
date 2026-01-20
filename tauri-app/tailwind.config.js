/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          cream: '#FEF3E2',
          orange: '#F97316',
          coral: '#FF6B6B',
          peach: '#FF8A95',
          rose: '#FB7185',
          amber: '#FBBF24',
        },
      },
      backgroundImage: {
        'warm-gradient': 'linear-gradient(to bottom right, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
