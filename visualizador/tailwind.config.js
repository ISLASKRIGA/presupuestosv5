/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        inper: {
          blue: '#003B73',
          teal: '#006B8F',
          light: '#E8F4FD',
        }
      }
    },
  },
  plugins: [],
}
