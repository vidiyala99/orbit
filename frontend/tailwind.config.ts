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
