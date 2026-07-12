/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0C0A07",
        surface: "#161209",
        line: "#2A2016",
        ink: "#F2E8D5",
        muted: "#9C9183",
        gold: "#D4AF37",
        signal: "#3DDC97",
        warn: "#E8A33D",
        critical: "#E2574C",
        accent: "#D4AF37",
      },
      fontFamily: {
        sans: ["var(--font-display)", "ui-sans-serif", "system-ui"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(226, 87, 76, 0.5)",
          },
          "50%": {
            boxShadow: "0 0 0 6px rgba(226, 87, 76, 0)",
          },
        },
        "ping-slow": {
          "0%": { transform: "scale(1)", opacity: "0.7" },
          "75%, 100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ping-slow": "ping-slow 2.2s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [],
};
