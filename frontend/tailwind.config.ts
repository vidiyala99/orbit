import type { Config } from "tailwindcss";

/* ===== Actintro — living Operate UI (see /DESIGN.md)
 *
 *  Not teal-SaaS instrument. Lobby-night energy:
 *  Syne display, coral act, cool slate field with atmosphere.
 */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "#BFC9D6",
        surface: "#D0D8E4",
        "surface-raised": "#E2E8F0",
        ink: "#10141C",
        ink2: "#3A4354",
        ink3: "#5C6678",
        accent: "#E23D2B",
        "accent-soft": "#F7C9C2",
        "accent-deep": "#B82E20",
        signal: "#0F6E5C",
        "signal-soft": "#B8DFD4",
        rule: "#A0AAB8",
        rust: "#B42318",
        "rust-soft": "#F8E2DF",
        amber: "#A16207",
        "amber-soft": "#F5EBD0",
        "tab-idle": "#8B95A8",
        parchment: "#F1F3F5",
        lake: "#0F6E5C",
        "desk-wash": "#E4E9F0",
        nearink: "#10141C",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
        serif: ["var(--font-display)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        hand: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "fl-xs": ["0.75rem", { lineHeight: "1.35", letterSpacing: "0.02em" }],
        "fl-sm": ["0.875rem", { lineHeight: "1.45" }],
        "fl-base": ["1rem", { lineHeight: "1.55" }],
        "fl-md": ["1.125rem", { lineHeight: "1.4" }],
        "fl-lg": ["1.375rem", { lineHeight: "1.2", letterSpacing: "-0.03em" }],
        "fl-xl": ["1.75rem", { lineHeight: "1.12", letterSpacing: "-0.035em" }],
        "fl-2xl": ["2.25rem", { lineHeight: "1.05", letterSpacing: "-0.04em" }],
        "fl-hero": ["clamp(2.25rem, 1.6rem + 3vw, 3.5rem)", { lineHeight: "1.02", letterSpacing: "-0.045em" }],
      },
      borderRadius: {
        card: "10px",
        field: "6px",
        hero: "14px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,20,28,.05), 0 8px 24px rgba(16,20,28,.06)",
        "card-hover": "0 2px 4px rgba(16,20,28,.06), 0 12px 28px rgba(16,20,28,.08)",
        raised: "0 4px 14px rgba(16,20,28,.12)",
        "raised-hover": "0 6px 18px rgba(16,20,28,.16)",
        tabbar: "0 -4px 16px rgba(16,20,28,.12)",
        sheet: "0 -6px 20px rgba(16,20,28,.1)",
        glow: "0 0 0 1px rgba(226,61,43,.16), 0 8px 20px rgba(226,61,43,.14)",
        "glow-hover": "0 0 0 1px rgba(226,61,43,.22), 0 10px 24px rgba(226,61,43,.18)",
      },
    },
  },
  plugins: [],
} satisfies Config;
