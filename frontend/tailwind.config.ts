import type { Config } from "tailwindcss";

/* ===== Sage & Stone — design tokens =====
 *
 *  PALETTE  ground #F5F3EE · surface #FFFFFF · ink #2F332C · ink3 #7C8B6E ·
 *           accent #5B7A5B · accent-soft #E4EADF (chip/selected fill) ·
 *           rule #E7E4DC (dividers/borders)
 *
 *  The decision sheet's single "ink2" is split in two here for contrast:
 *  #7C8B6E lands around 3.4:1 on white, which is fine for the mono
 *  timestamps/counts it was drawn for but fails AA for prose. So
 *  `ink2` (#5C6355, ~5.9:1) carries secondary body copy and `ink3`
 *  (#7C8B6E) carries the low-emphasis meta the sheet used it for.
 *
 *  TYPE     Manrope for everything — one face, weight carries hierarchy.
 *           IBM Plex Mono, small, for timestamps/counts only.
 *  SHAPE    14px card radius, 999px pill radius for chips/buttons/tabs.
 *           ONE elevation technique: soft low-opacity ink-tinted shadow.
 */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "#F5F3EE",
        surface: "#FFFFFF",
        ink: "#2F332C",
        ink2: "#5C6355",
        ink3: "#7C8B6E",
        accent: "#5B7A5B",
        "accent-soft": "#E4EADF",
        rule: "#E7E4DC",
        /* Idle label inside the dark tab bar — the only colour that only ever
           sits on ink. */
        "tab-idle": "#93A08A",
        /* Landing split-hero only. Do not reuse on /attendees. */
        parchment: "#F9F7F2",
        lake: "#3A7CA5",
        "desk-wash": "#E4EBF1",
        nearink: "#161616",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      /* Fluid type scale (marketing pages) — clamp(min, preferred, max) so
       * text scales continuously with the viewport instead of snapping at
       * sm:/lg: breakpoints. Preferred value ramps against 100vw so it settles
       * at its max around a ~1280px viewport rather than growing forever. */
      fontSize: {
        "fl-xs": ["clamp(0.75rem, 0.72rem + 0.15vw, 0.8125rem)", { lineHeight: "1.4" }],
        "fl-sm": ["clamp(0.8125rem, 0.77rem + 0.2vw, 0.9375rem)", { lineHeight: "1.5" }],
        "fl-base": ["clamp(0.9375rem, 0.88rem + 0.3vw, 1.0625rem)", { lineHeight: "1.6" }],
        "fl-md": ["clamp(1rem, 0.92rem + 0.4vw, 1.1875rem)", { lineHeight: "1.55" }],
        "fl-lg": ["clamp(1.125rem, 1.02rem + 0.5vw, 1.375rem)", { lineHeight: "1.35" }],
        "fl-xl": ["clamp(1.375rem, 1.15rem + 1.1vw, 1.875rem)", { lineHeight: "1.25" }],
        "fl-2xl": ["clamp(1.75rem, 1.35rem + 2vw, 2.75rem)", { lineHeight: "1.15" }],
        "fl-hero": ["clamp(2.125rem, 1.5rem + 3.1vw, 3.5rem)", { lineHeight: "1.12" }],
      },
      borderRadius: {
        card: "14px",
        field: "10px",
      },
      boxShadow: {
        card: "0 3px 12px rgba(47,51,44,.08)",
        "card-hover": "0 8px 20px rgba(47,51,44,.13)",
        raised: "0 6px 14px rgba(47,51,44,.25)",
        "raised-hover": "0 9px 18px rgba(47,51,44,.3)",
        tabbar: "0 8px 20px rgba(47,51,44,.3)",
        sheet: "0 -8px 28px rgba(47,51,44,.18)",
      },
    },
  },
  plugins: [],
} satisfies Config;
