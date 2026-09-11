import type { Config } from "tailwindcss";

/* ===== Signal — design tokens =====
 *
 *  Identity: Orbit surfaces who needs you, the moment it matters — a beacon
 *  cutting through a dark room, not a filing cabinet. The name is literal:
 *  the OrbitMark (ring + tilted orbit) is the one recurring shape, and the
 *  accent behaves like a glow (soft radial halo, tinted shadow) rather than
 *  a flat fill. Replaces the old warm-paper "Field Notebook" identity
 *  wholesale — different palette family, different type pairing, no
 *  handwriting face, no stamp motif.
 *
 *  PALETTE  ground #F4F1EA (warm bone, not paper-yellow, not sterile white)
 *           surface #FDFCF8 (elevated card, barely lighter than ground)
 *           ink #211D1A (warm near-black charcoal — text AND dark sections,
 *             one hue family instead of jumping to #000/#111)
 *           ink2 #5C5548 (~7.6:1 on ground, body copy)
 *           ink3 #8B8373 (~4.3:1, meta/mono only — timestamps, counts)
 *           accent #9C540E (single accent: burnt amber/ember — a porch light
 *             in the dark, not blue-purple AI-gradient, not the old sealing-
 *             wax red, not recipe-app terracotta — warmer and darker than
 *             both) · accent-soft #F6E2C3 (amber wash for highlight surfaces)
 *           rule #E3DDD0 (hairline borders)
 *
 *  TYPE     Bricolage Grotesque for display/headlines — a grotesque sans
 *           with enough quirk (ink-trap joints, slightly irregular
 *           terminals) to carry personality without becoming a serif
 *           costume.
 *           Public Sans for body copy — humanist, warm x-height, not Inter.
 *           JetBrains Mono, small, for timestamps/counts/labels.
 *           No handwriting face — the old Caveat margin-note treatment is
 *           dropped; the "founding idea" quote now runs in large display
 *           italic instead.
 *  SHAPE    Varied radius (10 / 18 / 28px) rather than one uniform value —
 *           tighter on inputs, generous on cards, expansive on hero panels.
 *           999px pill radius stays for chips/buttons/tabs.
 *           TWO elevation techniques: a neutral ink-tinted shadow for normal
 *           lift, and a signature amber "glow" shadow reserved for the one
 *           thing on a view that's asking for the user's attention (the
 *           needs-you list, primary CTA) — never used decoratively.
 */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "#F4F1EA",
        surface: "#FDFCF8",
        ink: "#211D1A",
        ink2: "#5C5548",
        ink3: "#8B8373",
        accent: "#9C540E",
        "accent-soft": "#F6E2C3",
        rule: "#E3DDD0",
        /* Urgency accents — home dashboard "needs follow-up" severity only.
           rust = needs you now (redder than the main amber accent so the two
           never get mistaken for each other), amber = worth doing soon
           (olive-gold, deliberately not the same hue as the primary accent).
           Not general chip colors; don't reach for these outside priority
           signaling. */
        rust: "#9A3E22",
        "rust-soft": "#F1DDCF",
        amber: "#7A5D12",
        "amber-soft": "#F0E8C6",
        /* Idle label inside the dark tab bar — the only colour that only ever
           sits on ink. */
        "tab-idle": "#B0A99B",
        /* Landing split-hero only. Do not reuse on /attendees. */
        parchment: "#F5EEDD",
        lake: "#5C6E5C",
        "desk-wash": "#EEE4CE",
        nearink: "#1D1915",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
        serif: ["var(--font-display)", "Georgia", "serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        hand: ["var(--font-display)", "Georgia", "serif"],
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
        card: "18px",
        field: "10px",
        /* Large hero/feature panels only — deliberately larger than `card`
           so panels read as a distinct, more generous surface. */
        hero: "28px",
      },
      boxShadow: {
        card: "0 3px 12px rgba(33,29,26,.08)",
        "card-hover": "0 8px 20px rgba(33,29,26,.13)",
        raised: "0 6px 14px rgba(33,29,26,.25)",
        "raised-hover": "0 9px 18px rgba(33,29,26,.3)",
        tabbar: "0 8px 20px rgba(33,29,26,.3)",
        sheet: "0 -8px 28px rgba(33,29,26,.18)",
        /* Signature glow — reserved for the one element per view that's
           actively asking for attention (needs-you list, primary CTA).
           Never decorative; a warm amber halo, not a generic drop shadow. */
        glow: "0 0 0 1px rgba(156,84,14,.16), 0 10px 28px rgba(156,84,14,.22)",
        "glow-hover": "0 0 0 1px rgba(156,84,14,.22), 0 14px 34px rgba(156,84,14,.28)",
      },
    },
  },
  plugins: [],
} satisfies Config;
