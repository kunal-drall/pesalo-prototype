/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#080B11",
          secondary: "#0E1219",
          tertiary: "#151B24",
          elevated: "#1C232E"
        },
        brand: {
          primary: "#16A367",
          primaryLight: "#1ECC7F"
        },
        accent: {
          gold: "#F5B731",
          goldLight: "#FFD166"
        }
      }
    }
  },
  plugins: []
};
