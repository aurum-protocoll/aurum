/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0E0C08",
        surface: "#181410",
        line: "#2B2419",
        ink: "#F0EAE0",
        muted: "#9C9183",
        gold: "#D4AF37",
        signal: "#3DDC97",
        warn: "#E8A33D",
        critical: "#E2574C",
        accent: "#D4AF37",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};
