---
# gstack: design-md-format=spec
name: Actintro
description: Badge world. The ranked room, one guest at a time; each guest is an off-white PVC badge you read across the room and decide in one tap. Hot pink is Keep.
colors:
  keep-pink: "#f8376b"
  keep-pink-press: "#de2a5a"
  keep-ink: "#0a0a0b"
  undo: "#f8376b"
  undo-dark: "#b0104a"
  tier-green: "#68b86a"
  tier-high: "#c9e5c9"
  tier-later: "#e4e1de"
  tier-ink: "#0a0a09"
  ground: "#f2f3f5"
  ground-raised: "#ffffff"
  ink: "#111214"
  ink-muted: "#4b5059"
  rule: "#c9ccd2"
  card: "#f2efeb"
  card-edge: "#d9d4d0"
  card-ink: "#0b0b0c"
  card-muted: "#4a4745"
  card-rule: "#cfc8c4"
  skip-mark: "#6d727a"
  focus: "#0b3bcd"
  skeleton: "#e2e4e8"
  ground-dark: "#0a0b0b"
  ground-raised-dark: "#17181a"
  ink-dark: "#f3f3f4"
  ink-muted-dark: "#a8abb1"
  rule-dark: "#3a3c40"
  card-edge-dark: "#f2efeb"
  card-ink-dark: "#0a0a0a"
  card-muted-dark: "#474645"
  card-rule-dark: "#c2c0c1"
  skip-mark-dark: "#9ea2a9"
  focus-dark: "#8fa8ff"
  skeleton-dark: "#1d1f22"
typography:
  badge-name:
    fontFamily: "Big Shoulders, Arial Narrow, sans-serif"
    fontSize: "min(4.6rem, Ncqi)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.015em"
  event-title:
    fontFamily: "Carlito, system-ui, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  last-name:
    fontFamily: "Carlito, system-ui, sans-serif"
    fontSize: "1.4rem"
    fontWeight: 700
    lineHeight: 1.1
  button:
    fontFamily: "Carlito, system-ui, sans-serif"
    fontSize: "1.15rem"
    fontWeight: 700
  job-title:
    fontFamily: "Carlito, system-ui, sans-serif"
    fontSize: "0.97rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Carlito, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
  section-heading:
    fontFamily: "Carlito, system-ui, sans-serif"
    fontSize: "1.06rem"
    fontWeight: 700
  label:
    fontFamily: "Carlito, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
  chip:
    fontFamily: "Carlito, system-ui, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 700
    lineHeight: 1.25
  tab:
    fontFamily: "Carlito, system-ui, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 700
  meta:
    fontFamily: "Carlito, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    fontFeature: "tnum"
rounded:
  chip: "0.3rem"
  photo: "0.45rem"
  button: "0.5rem"
  toast: "0.6rem"
  badge: "0.85rem"
  full: "9999px"
spacing:
  chip-gap: "0.3rem"
  dock-gap: "0.5rem"
  stage-gap: "0.75rem"
  gutter: "1rem"
  gutter-desktop: "2rem"
  touch: "2.75rem"
  decision: "3rem"
components:
  button-keep:
    backgroundColor: "{colors.keep-pink}"
    textColor: "{colors.keep-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    height: "{spacing.decision}"
  button-keep-hover:
    backgroundColor: "{colors.keep-pink-press}"
  button-skip:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    height: "{spacing.decision}"
  button-skip-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
  button-social:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    height: "{spacing.touch}"
  badge-face:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-ink}"
    rounded: "{rounded.badge}"
  chip-signal:
    backgroundColor: "transparent"
    textColor: "{colors.card-ink}"
    typography: "{typography.chip}"
    rounded: "{rounded.chip}"
    padding: "0.15rem 0.45rem"
  chip-company:
    backgroundColor: "{colors.card-ink}"
    textColor: "{colors.card}"
    typography: "{typography.chip}"
    rounded: "{rounded.chip}"
    padding: "0.15rem 0.45rem"
  tier-top:
    backgroundColor: "{colors.tier-green}"
    textColor: "{colors.tier-ink}"
    padding: "0.3rem 0.8rem"
  tier-strong:
    backgroundColor: "{colors.tier-high}"
    textColor: "{colors.tier-ink}"
  tier-worth-a-look:
    backgroundColor: "{colors.tier-later}"
    textColor: "{colors.tier-ink}"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.toast}"
  tab-bar:
    backgroundColor: "{colors.ground-raised}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.tab}"
  tab-active:
    textColor: "{colors.ink}"
    iconColor: "{colors.keep-pink}"
  toast-undo:
    textColor: "{colors.undo}"
    height: "{spacing.touch}"
---

# Design System: Actintro

## Overview

**Creative North Star: "The Badge World"**

Actintro's app is the ranked guest list of a real event, one guest at a time. Each guest is an off-white PVC name badge hanging from a metal clip: a heavy condensed first name you can read across a room, a photo, a title, a few chips, a match band, and the one line that tells you how to approach them. You read it, open LinkedIn or X, and decide Keep or Skip in one tap. The system refuses two things by construction: the swipe dating card (the badge is an object with a clip and a punched slot, not a glossy photo card) and the SaaS list (one person fills the stage, never a table).

The world is built for the room: a phone, one hand, bad light, seconds of attention. Ground follows the phone's system appearance (near-white or near-black), but the badge itself stays physical off-white PVC in both. Color is almost absent. Hot pink means Keep and nothing else; green means match strength. Everything else is ink on ground or ink on card. Density is low on purpose: one badge, one dock, one decision.

The handoff between badges is the focal motion moment: a kept badge swings off to the right with a pink wash and the next one drops onto the clip; a skipped badge slides left. Keyboard work is instant, and reduced motion becomes crossfades.

**Status and scope (as of commit 3e92c53, live at actintro.com).** Only Home (`/home`, including its loading state) is built in the Badge world. Events, the Events guest list, Inbox, the person page, onboarding, auth, and the marketing landing still render the superseded "Lobby night" look (Syne, IBM Plex Sans, JetBrains Mono, coral `#E23D2B` on slate, tokens in `frontend/app/globals.css` and the Tailwind theme, chrome in `components/AppNav.tsx`). Those surfaces are **not yet migrated**; the Lobby night look is not a target and must not be extended. New or redesigned app surfaces use this document. The Badge world is scoped under the `.badge-world` class so unmigrated pages keep working until they move.

**Key Characteristics:**
- Off-white PVC badge with a metal clip and punched slot, in light and dark.
- Big Shoulders black-weight uppercase first names, sized to fit the column.
- Carlito for every other word; body never below 16px on phones.
- Hot pink is Keep; green tier band is match strength; no other accent.
- Phone: one flippable card. Desktop (900px and up): open badge holder, identity left, context right.
- Motion is spent on the badge handoff and the flip; keyboard is instant.

## Colors

A near-achromatic world (cool grey ground, warm off-white card, ink) with exactly one loud accent for the decision and one quiet green scale for match strength.

### Primary
- **Keep Pink** (keep-pink): Keep button fill, Keep press/hover (keep-pink-press), the Keep flash on a leaving badge, the countdown bar in the toast, the active phone tab icon, and the active desktop top-nav underline. Text on pink is keep-ink, never white. Pink used as text must still meet 4.5:1: the Undo label uses the undo token (keep-pink on the dark toast in light mode, the deeper undo-dark on the light toast in dark mode), and the active phone tab keeps its label in ink with only the icon in pink (icons need 3:1).

### Secondary
- **Tier Green** (tier-green): the full-strength match band for "Top match". "Strong match" uses the pale tier-high; "Worth a look" uses the warm grey tier-later. All three carry tier-ink text and a star glyph. Tier colors do not change in dark mode because they sit on the badge.

### Neutral
- **Ground** (ground / ground-dark): the page. Cool near-white in light, near-black in dark.
- **Raised Ground** (ground-raised / ground-raised-dark): tab bar, hover fills for Skip, socials and chevrons.
- **Ink and Muted Ink** (ink, ink-muted and dark variants): page text, Skip and social outlines, toast background (inverted), event time and hints.
- **Rule** (rule / rule-dark): header hairline on desktop, tab bar top border, counter box, disabled chevrons.
- **PVC Card** (card): the badge face. The same off-white in both appearances.
- **Card Ink, Card Muted, Card Rule, Card Edge** (card-ink, card-muted, card-rule, card-edge): text, secondary text, dividers, photo placeholder, and the 1px face border on the badge. In dark mode the edge becomes the card color (the border disappears) and card-rule/card-muted shift slightly.
- **Focus Blue** (focus / focus-dark): the only focus ring color.
- **Skeleton** (skeleton / skeleton-dark): loading placeholders.

### Named Rules
**The Keep Pink Rule.** Pink is spent only on Keep and on things that point back to Keep (its press state, the Keep flash, the Undo action and its countdown, the active destination). Never use it for decoration, links, headings, badges of status, or errors.

**The PVC Stays PVC Rule.** The badge card is off-white `#f2efeb` in light and dark. Dark mode changes the ground around the badge, removes its shadow, and hides its edge; it never darkens the card.

**The Theme Follows The Phone Rule.** Appearance comes from `prefers-color-scheme` only. Every new token needs a light value and a dark value (or a stated reason it is card-bound and constant), and both must meet WCAG 2.2 AA.

## Typography

**Display Font:** Big Shoulders (`--font-badge-name`, fallback Arial Narrow, sans-serif)
**UI and Body Font:** Carlito (`--font-badge-ui`, weights 400 and 700, fallback system-ui, sans-serif)

**Character:** A tall, black, condensed badge name printed like event credentials, against a plain humanist sans that stays out of the way. Two faces, two weights of the UI face (400 and 700). No mono, no italics, no letter-spaced uppercase labels.

### Hierarchy
Sizes below are phone first; tablet (600 to 899px) and desktop (900px and up) overrides follow.
- **Badge Name** (Big Shoulders 900, uppercase, line-height 0.86, tracking -0.015em, one line): the first name only. Size is `min(var(--bw-name-xl), Ncqi)` where N = 100 / (max(chars, 3) x 0.56), so long names shrink to the identity column instead of wrapping. Cap `--bw-name-xl`: 4.6rem phone, 3.6rem short phone (height 720px or less), 5.8rem tablet, 6.5rem desktop. Initials in avatar fallbacks also use this face (800).
- **Event Title** (700, 1.45rem, line-height 1.15, tracking -0.01em): the page h1. 1.25rem on short phones, 1.9rem desktop.
- **Last Name** (700, 1.4rem, line-height 1.1): under the badge name. 1.2rem short phone, 1.75rem tablet, 1.8rem desktop.
- **Decision Button** (700, 1.15rem): Skip and Keep.
- **Section Heading** (700, 1.06rem): back-of-badge and right-card headings (How to approach, Why meet, Recent, Background, company name). 1.2rem desktop.
- **Body** (400, 1rem, line-height 1.4 for the opener, 1.45 for back text): How to approach on the front, all back-of-badge text. Desktop right card is 1.1rem / 1.5; the desktop opener is bold at 1.15rem.
- **Job Title** (700, 0.97rem, line-height 1.3, clamped to two lines). 1rem tablet, 1.15rem desktop.
- **Meta** (400, 0.95rem, tabular numerals): event time, social button labels (700). Desktop event time 1.05rem; the n of N counter is 700 with "of" at 400.
- **Label** (700, 0.875rem, sentence case): the "How to approach" and "Recent" labels on the badge front.
- **Chip** (700, 0.82rem, line-height 1.25). 0.9rem desktop. The match band is 0.9rem (0.95rem desktop).
- **Tab** (700, 0.82rem under a 24px icon on phone; 1rem, no icon, in the desktop top nav).
- **Toast** (400, 0.9rem; Undo 700).

### Named Rules
**The 16px Floor Rule.** Reading text on phones (the opener and every back-of-badge paragraph) is never below 1rem. Supporting text (chips, labels, tabs, tablet-only Why and company bullets) may go down to about 0.8rem, never lower for anything a user must read to decide.

**The Name Fits Rule.** The first name is always one uppercase line that sizes itself to its container. Never wrap it, truncate it with an ellipsis, or give it a fixed size.

**The Two Faces Rule.** Big Shoulders is only for the person's first name and initials. Titles, the wordmark, buttons, and body are Carlito.

## Layout

**Phone (under 600px).** A single column capped at 34rem, locked to the screen height so the badge shrinks to fit and the dock always sits above the tabs. Order: header (wordmark row, event title, event time), the badge stage, the dock (LinkedIn/X row, then Skip and Keep), then the bottom tab bar. Gutters are 1rem; the stage-to-dock gap is 0.75rem; the dock's internal gap is 0.5rem. The badge stage is between 13rem and 36rem tall. No counter, no arrows, no progress indicator: swipe browses and the queue loops.

**Short phones (under 900px wide and 720px tall or less).** Smaller name caps, a 1.25rem title, tighter header and badge rhythm, the opener clamped to four lines on the front (shown in full on the back), company bullets hidden from the front.

**Tablet (600 to 899px).** The phone layout, roomier: column up to 42rem, no stage height cap, a full-width tab bar, larger names. The front also shows Why (up to 7 lines), Recent, and company bullets; the back then skips Why.

**Desktop (900px and up): the open badge holder.** Column up to 78rem with 2rem side padding; the page scrolls normally. The header gets a bottom hairline, the wordmark and top nav share the top row, and the event title and time sit left of the ‹ n of N › counter. Front and back sit side by side in a two-column grid (1.5rem gap, up to 68rem wide, no clip, no flip), at height `clamp(22rem, calc(100dvh - 18.5rem), 46rem)`. The left card is identity only (photo at 45%, name, title, chips, match band). The right card carries all context (How to approach, Why meet, Recent, Background, company bullets, LinkedIn/X) and scrolls inside itself when long. The dock (up to 40rem) is centered below with Skip (S), wider Keep (K), and the hint "Use the arrow keys to browse."

**Inside the badge front.** A two-column grid: photo at 42% (45% desktop) and an identity column. Below 900px, a text column that runs long fades out above the match band instead of colliding with it.

### Named Rules
**The Dock Never Drops Rule.** Skip and Keep are always visible without scrolling. On phones the badge shrinks; on desktop the cards cap their height and scroll internally.

**The Once Per Screen Rule.** LinkedIn and X appear exactly once on any screen: in the dock on phones and tablets (never on the flip side), on the right card on desktop.

## Elevation & Depth

Mostly flat. Depth comes from the badge as a physical object, not from layered surfaces. The ground, tab bar, dock, and buttons have no shadows; the tab bar separates with a 1px rule.

### Shadow Vocabulary
- **Badge lift** (`box-shadow: 0 1px 2px rgba(17, 18, 20, 0.06), 0 10px 28px rgba(17, 18, 20, 0.08)`): the badge face in light mode only. None in dark mode.
- **Keep pressed** (`box-shadow: inset 0 0 0 2.5px keep-ink`): Keep when you browse back to someone you kept.
- **Active top nav** (`box-shadow: inset 0 -2px 0 keep-pink`): the current destination on desktop.
- **Metal clip** (`linear-gradient(90deg, #8c8c8c, #e9e9e9 45%, #b5b5b5)` with `inset 0 -2px 0 rgba(0,0,0,0.25)`): the one piece of material rendering, a small metal clip above the badge on phones and tablets. It is part of the world's own material. It is not a license for gradients elsewhere.
- **Scroll fade** (mask: solid to transparent over the last 2.5rem): tells you a long back-of-badge or right card scrolls.

### Named Rules
**The Object, Not Chrome Rule.** Only the badge gets depth. Controls, bars, and the page stay flat.

## Shapes

- **Badge face:** softly rounded PVC rectangle (0.85rem radius), a 1px edge, and a black pill slot (2.4rem x 0.42rem) punched near the top center. Content keeps clear of the slot.
- **Photo:** gently rounded (0.45rem) inside the badge; the back-of-badge thumbnail is 2.75rem at 0.35rem.
- **Buttons and social buttons:** 0.5rem radius, a 1.5px ink outline for Skip, socials and empty-state links. Keep is a solid fill with no outline.
- **Chips:** 0.3rem radius with a 1px card-ink border.
- **Match band:** a square-cornered stripe that bleeds 0.35rem past the identity column's left edge, like a printed credential band.
- **Toast:** 0.6rem radius, with a 2px countdown bar along its bottom edge.
- **Focus ring:** 2px focus color, 2px offset, 6px radius.

## Components

### Buttons
Tactile, flat, and big: the decision is the largest control on the screen.
- **Shape:** 0.5rem radius; Skip and Keep are 3rem tall, social buttons 2.75rem.
- **Keep:** keep-pink fill, keep-ink label, 1.15rem bold, in a 2fr (Skip) : 3fr (Keep) grid so Keep is always wider. Hover (fine pointers only) moves to keep-pink-press. Browsing back to a kept person shows a 2.5px inset ink ring.
- **Skip:** transparent with a 1.5px ink outline; hover fills with raised ground; when you browse back to a skipped person it inverts to ink fill with ground text.
- **Press:** all dock buttons scale to 0.97 on press (120ms, ease `cubic-bezier(0.23, 1, 0.32, 1)`); background changes take 150ms.
- **Keyboard hints:** on desktop, Skip and Keep show an S / K key cap (0.75rem, 1px currentColor border, 75% opacity). Buttons expose `aria-keyshortcuts` and `aria-pressed`.
- **Social (LinkedIn / X):** equal-width outlined buttons with an inline SVG glyph and the word "LinkedIn" or "X". The LinkedIn "in" is knocked out to whatever surface sits behind it.

### Chips
- **Signal chip:** transparent, 1px card-ink border, bold card-ink text; up to three signals.
- **Company chip:** always first when a company is known, inverted (card-ink fill, card text) with a small building glyph and a visually hidden "Works at" prefix.

### Cards / Containers: the Badge (signature component)
- **Front:** photo (initials underneath, 3rem Big Shoulders), first name, last name, a hairline rule, job title, chips, then the "How to approach" label and opener. The match band sits at the bottom of the identity column: star glyph plus "Top match", "Strong match", or "Worth a look".
- **Back (flip side on phones and tablets, right card on desktop):** small photo with full name and title (hidden on desktop), then sections divided by card-rule hairlines: How to approach, Why meet, Recent, Background (5-line clamp), company bullets. Phones lead with Why because the front carries the opener; people without research get both on the back.
- **Interaction:** phones and tablets flip the badge on tap or Space (not on links or buttons). The badge follows a horizontal drag, tilting up to 7° at 240px; releasing past 80px or faster than 500px/s browses, and a shorter drag springs back (0.35s, bounce 0.25). A new badge never arrives already flipped. Desktop does not drag or flip.
- **Exiting badges** are `inert` (not just aria-hidden) so they release focus and ignore input while they animate out. The hidden side of a flipped badge is `inert` and aria-hidden too.

### Dock and Toast
- **Dock:** LinkedIn/X row (phones and tablets only), then Skip and Keep.
- **Toast:** ink-filled pill with "Kept {name}. Added to Inbox." or "Skipped {name}." and a 44px-tall Undo action in the undo color. On phones and tablets it floats 10px above the dock so it never covers Skip or Keep; on desktop it sits 1.5rem from the bottom. The Undo window is 4500ms, shown by a pink bar that shrinks from full width to zero, and it pauses while a pointer is over the toast or focus is inside it (WCAG 2.2.1). A new toast replaces the old one in place and restarts the timer. Save failures use the same toast without Undo: "Couldn't save that decision. Check your connection and try again."

### Navigation
- **Phone and tablet:** a sticky bottom tab bar (Home, Events, Inbox) on raised ground with a top rule, a 24px outline icon over a 0.82rem bold label, at least 2.9rem tall, and safe-area padding. The active tab's label turns ink and its icon keep-pink.
- **Desktop:** the same three destinations as text links in the header row, 2.75rem tall; the active one is ink with a 2px pink underline.
- **Queue counter (desktop only):** ‹ n of N › with 2.75rem chevron buttons and a rule-outlined count box; digits roll in the browse direction. Disabled chevrons use the rule color.
- The legacy `AppNav` is hidden on `/home`; the Badge world renders its own navigation.

### Empty and Loading States
- **Empty room:** a centered block (max 22rem): "Nobody left to review" or "No event to review yet", a muted explanation, and an outlined link to the guest list or Events.
- **Loading:** the real shell (wordmark, header bars, clip, badge silhouette, dock bar) in skeleton color, pulsing to 55% opacity every 1.4s when motion is allowed.
- **Avatar:** initials are always underneath. Photos show immediately; only a photo still loading when the page hydrates fades in from an 8px blur (opacity 240ms, blur 420ms). Broken photos fall back to initials.

### Motion
Motion comes from `frontend/components/badge/badgeMotion.ts` (framer-motion) inside `MotionConfig reducedMotion="user"`, plus a few CSS keyframes.
- **Easing:** out `cubic-bezier(0.23, 1, 0.32, 1)` (also the CSS `--bw-ease`); exit `cubic-bezier(0.32, 0.72, 0, 1)`.
- **Browse:** the arriving badge springs in from the browse side (0.42s, bounce 0.12; 90px and 3° on phones, 40px with no rotation and 0.3s on desktop); the leaving one fades out to the opposite side in 0.2s.
- **Keep:** the badge exits right to 115% with an 11° swing and a -18px lift in 0.28s, with a pink wash peaking at 32% opacity (phones and tablets). The next badge drops onto the clip from -22px and -1.5° (spring 0.52s, bounce 0.28, 60ms delay). On desktop it moves 80px with no rotation and the next badge rises 12px.
- **Skip:** exits left to -115% with -8° in 0.26s; the same drop-in follows.
- **Undo:** the current badge shrinks to 0.96 and fades in 0.15s; the restored badge returns from its side (120px and 6°; 60px on desktop).
- **Flip:** a real 3D rotateY spring (0.55s, bounce 0.18) with a slight lift (scale dips to about 0.965 at the midpoint over 0.5s), perspective 1400px.
- **First paint:** the badge settles onto its clip (520ms, from -14px and -1.4° with a small overshoot). Content is visible throughout, with or without JavaScript.
- **Toast:** springs up 14px (0.35s, no bounce) and exits 8px down in 0.15s.
- **Keyboard (arrow keys, K, S) and initial load swap instantly.**
- **Reduced motion:** badge swaps and the flip become 180ms crossfades; the settle and skeleton pulse are off; drag release snaps back without a spring.

### Named Rules
**The Handoff Is The Moment Rule.** Motion is spent on the badge leaving and arriving, the flip, and the toast. Nothing else animates on entrance. Anything repeated constantly (keyboard browsing, K/S) is instant.

## Do's and Don'ts

### Do:
- **Do** scope Badge world styles under `.badge-world` and use the `--bw-*` tokens; never hardcode a light-only value.
- **Do** keep primary targets at least 44px (Skip and Keep 48px, social buttons and desktop tabs 44px, phone tabs about 46px) and secondary browse controls at least 24px, always with an alternative (swipe or arrow keys).
- **Do** keep Keep wider than Skip (3fr : 2fr) and put Skip on the left.
- **Do** show the focus ring (2px focus color, 2px offset) on every link and button.
- **Do** give screen readers a polite live status ("Name, n of N[, kept|skipped]") since phones show no counter.
- **Do** make exiting badges and the hidden badge side `inert`.
- **Do** pause any timed Undo window on hover and focus.
- **Do** write copy without em dashes, in sentence case, using the domain verbs Keep and Skip.
- **Do** label thin or pending data honestly (card-muted text) instead of hiding it.

### Don't:
- **Don't** extend the Lobby night look (Syne, IBM Plex Sans, JetBrains Mono, coral `#E23D2B`, slate ground, grain overlay) to new work; it is being replaced page by page.
- **Don't** use keep-pink for anything other than Keep and its echoes (see The Keep Pink Rule).
- **Don't** darken the badge card in dark mode.
- **Don't** show source tags such as "Luma bio", "LinkedIn", or "Company site" on the badge.
- **Don't** render LinkedIn/X more than once per screen or put them on the phone flip side.
- **Don't** add a lanyard rail, progress bar, or counter to phones; jump-to-person belongs to the Events guest list search.
- **Don't** add an expanding panel or sheet to the badge; the flip side is the detail view.
- **Don't** drop phone reading text below 1rem.
- **Don't** use uppercase letter-spaced eyebrow labels, mono meta text, or glyph-font icons; labels are sentence-case Carlito bold and icons are inline SVG.
- **Don't** animate keyboard-driven browsing or K/S.

## Decisions log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-12 | Brand Actintro; Keep and Skip as the core verbs | Identity for match and act |
| 2026-09-12 | Lobby night (Syne, coral, slate) | Superseded on 2026-09-13 by the Badge world; still present on unmigrated pages |
| 2026-09-13 | Badge world for Home: off-white PVC badge, clip and slot, hot pink Keep, green tier band, Big Shoulders names, Carlito UI | Approved comp home-badge-c; refuses swipe dating card and SaaS list |
| 2026-09-13 | Comps are reference, not pixel spec | Later user decisions diverge; verified by multi-viewport Playwright and interaction tests |
| 2026-09-13 | Phone = one flippable card; swipe browses and loops; no counter on phones | One job per view, one hand |
| 2026-09-13 | Desktop = open badge holder: identity left, all context right, Skip and wider Keep below | Wide screens have room for both sides; nothing repeats side by side |
| 2026-09-13 | Lanyard rail and progress indicator removed | Chunky, duplicated swipe, and progress barely moves in 500-guest rooms |
| 2026-09-13 | LinkedIn/X exactly once per screen; source tags removed | Deduped after live use |
| 2026-09-14 | Reading sizes raised: phone body and opener 1rem minimum, desktop body 1.1rem | Text was too small in the room |
| 2026-09-14 | framer-motion badge handoff, 3D flip, instant keyboard, reduced-motion crossfades | The handoff is the focal moment; repeated actions stay instant |
| 2026-09-14 | Pink text meets 4.5:1: active phone tab label in ink (pink icon), Undo uses an undo token (deeper pink in dark mode); Undo 44px; dead source-tag styles removed | Documenter found AA contrast and target-size failures |
