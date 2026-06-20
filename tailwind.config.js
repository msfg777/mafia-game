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
        mafia: {
          bg: '#1a1a2e',
          card: '#16213e',
          accent: '#e94560',
          day: '#f5f0e8',
          night: '#2d3561',
        }
      }
    },
  },
  plugins: [],
}
