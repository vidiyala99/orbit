import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        board: "#5B4A32",
        card: "#FBF3E3",
        ink: "#2A2216",
        ink2: "#6B5A3E",
        rule: "#D8C9A3",
        accent: "#B8461A",
        stamp: "#3F7A4C",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)"],
        hand: ["var(--font-caveat)"],
        body: ["var(--font-source-sans)"],
        mono: ["var(--font-plex-mono)"],
      },
      borderRadius: {
        card: "2px",
      },
    },
  },
  plugins: [],
} satisfies Config;
