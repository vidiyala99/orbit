---
# gstack: design-md-format=spec
name: Actintro
description: Lobby-night Operate UI — Syne display, coral act, cool slate field with atmosphere. Match under time pressure; not teal SaaS.
colors:
  primary: "#E23D2B"
  on-primary: "#FFFFFF"
  ground: "#BFC9D6"
  surface: "#D0D8E4"
  surface-raised: "#E2E8F0"
  text: "#10141C"
  text-muted: "#3A4354"
  text-faint: "#5C6678"
  accent: "#E23D2B"
  accent-soft: "#F7C9C2"
  accent-deep: "#B82E20"
  signal: "#0F6E5C"
  signal-soft: "#B8DFD4"
  rule: "#A0AAB8"
  success: "#0F6E5C"
  warning: "#A16207"
  warning-soft: "#F5EBD0"
  error: "#B42318"
  error-soft: "#F8E2DF"
  tab-idle: "#8B95A8"
  nearink: "#10141C"
typography:
  display:
    fontFamily: Syne
    fontWeight: 700
    fontSize: 1.375rem
    letterSpacing: -0.04em
  body:
    fontFamily: IBM Plex Sans
    fontSize: 1rem
    lineHeight: 1.55
  label:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    letterSpacing: 0.07em
  mono:
    fontFamily: JetBrains Mono
    fontFeature: tnum
rounded:
  sm: 4px
  md: 8px
  lg: 14px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  touch: 44px
breakpoints:
  phone: 0
  tablet: 768px
  desktop: 1024px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    minHeight: "{spacing.touch}"
  button-primary-hover:
    backgroundColor: "{colors.accent-deep}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.md}"
    minHeight: "{spacing.touch}"
  input:
    borderColor: "{colors.rule}"
    rounded: "{rounded.sm}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
  nav-link:
    textColor: "{colors.text}"
---

# Actintro Design System

## 0. Scope & status

| Surface | Mode | Status |
|---------|------|--------|
| **Home (Focus triage)** | Operate | **Active** — lobby energy; phone stage + desktop filmstrip |
| **Events (room picker + guest search)** | Operate | Active — `/events`, `/events/:id` |
| **App chrome (nav, auth)** | Operate | Active — top bar; coral underline active |
| **Inbox / person / landing** | Operate / Persuade | Inbox live; **landing Active** (waitlist + demo) |

**Platforms:** web + mobile web. Same tokens; layout adapts by breakpoint.

**Flavour locked:** **Lobby night** — opinionated Operate UI for the hour before the room. Not teal Linear-clone instrument. Not cream lifestyle.

---

## 1. Creative north star

**Match under time pressure. Act on the intro.**  
The UI should feel like a sharp guest list in a good lobby — atmosphere, bite in the type, one unmistakable Keep.

Audience: builders at Luma events (phone in pocket or laptop).

---

## 2. Design principles

1. **One job per view.** Home = Keep/Skip.
2. **Atmosphere over flat gray / marketplace void.** Soft field with coral + signal washes. Dense stage — not Airbnb empty catalog.
3. **Accent is rare and loud.** Coral = Keep / act / selected. Teal-green (`signal`) only for secondary success, never as primary CTA.
4. **Display has a face.** Syne for brand, titles, names. IBM Plex Sans for body. Mono for meta.
5. **Responsive by structure.** Phone stacks; desktop stages photo | panel. Touch ≥44px.
6. **Photo supports the decision.** Cap height so browse + Keep stay in the first viewport on phone.
7. **Quiet motion.** Press + swap only; honor `prefers-reduced-motion`.
8. **Same system everywhere.**

---

## 3. Color & token system

| Token | Hex | Role |
|-------|-----|------|
| `ground` | `#BFC9D6` | Deeper lobby dusk field |
| `surface` / `surface-raised` | `#D0D8E4` / `#E2E8F0` | Lifted controls |
| `ink` / `ink2` / `ink3` | `#10141C` / `#3A4354` / `#5C6678` | Text ladder |
| `accent` | `#E23D2B` | Keep, brand mark, active underline |
| `accent-soft` / `accent-deep` | `#F7C9C2` / `#B82E20` | Soft wash / press |
| `signal` | `#0F6E5C` | Secondary success (not CTA) |
| `rule` | `#A0AAB8` | Hairlines |

**Anti-patterns:** Inter/Roboto stacks; mint-teal SaaS chrome; purple gradients; cream+terracotta+serif lifestyle; broadsheet dense columns; glow halos as decoration.

---

## 4. Typography

- **Display:** Syne 600–800, tight tracking (−0.03 to −0.045em) — brand, event title, person name, Keep.
- **Body:** IBM Plex Sans 400–600 — why-meet, UI chrome.
- **Mono:** JetBrains Mono — counts, “starts tomorrow”, labels (often uppercase + tracking).
- Operate steps roughly `11 / 14 / 16 / 22 / 28` px. Why-meet measure ≤ ~40–65ch.

---

## 5. Spacing & layout

- Touch 44px. Related controls 8px; sections 24–32px.
- Phone Home locks to `100dvh − nav` so Skip/Keep never drop below the fold.
- Explicit **Prev / Next** on phone (not edge-tap only).
- Desktop: Event strip → photo | panel → avatar filmstrip.

---

## 6. Components

| Control | Rule |
|---------|------|
| **Keep** | Solid coral; Syne bold; wider than Skip; optional soft coral shadow |
| **Skip** | Ghost / hairline |
| **Nav active** | Coral underline — not mint pill |
| **Why meet** | Plain text + mono label |
| **Queue** | Avatars; active = coral ring |

---

## 7. Motion

Minimal: Keep/Skip `scale 0.97`; person swap opacity ≤180ms. No page-load choreography.

---

## Decisions log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-12 | Brand Actintro | Identity for match + act |
| 2026-09-12 | Left Calm-instrument teal | Felt generic B2B SaaS |
| 2026-09-12 | Lobby night: Syne + coral act + slate field | Alive Operate UI; user-approved leave from instrument tokens |
| 2026-09-12 | Phone: viewport-locked stage + Prev/Next + Keep | Buried CTAs failed usability |
| 2026-09-12 | Browse on-photo (not separate Prev/Next row) | Marketplace chrome fights Focus; Instagram edge affordance |
| 2026-09-12 | Desktop denser stage, not Airbnb empty field | Operate triage ≠ catalog; pull filmstrip up under match |
| 2026-09-12 | Desktop Keep/Skip under identity, before why/socials | Decide first; LI/X are secondary outbound |
| 2026-09-12 | Don't invent extra interactivity to fill void | More chrome = more distraction; densify instead |
| 2026-09-12 | Nav = destinations only (raised tab group) | Keep/Sync are Focus/event jobs; nav shouldn't compete |
| 2026-09-12 | Signal chips = solid coral on phone + desktop | One tone; soft chips read as a different system |
| 2026-09-12 | Phone Home/Focus gutters = 16px (8-grid md) | Align operate chrome; drop 12/14/20 odd paddings |
| 2026-09-12 | Match socials = LinkedIn/X touch chips (min 44px), mid-band browse | Full-height browse zones ate bottom taps; tiny text under-afforded |
| 2026-09-12 | Nav = Home · Events · Inbox (no peer Attendees) | Guest search under `/events/:id`; Home = Focus for active room |
| 2026-09-12 | Events/Inbox = Operate lists (strip + rank/filter; Inbox → person) | Match Home vocabulary; drafts not on list; no swipe rooms |
| 2026-09-12 | Guest detail always has ← Events | Predictable back (ui-ux-pro-max / Apple HIG escape routes) |
| 2026-09-12 | Guests default = Best (cap 15); Everyone for full room | Explicit best-match path; stop drowning in flat All 236 |
| 2026-09-12 | Guest row type: Syne name · medium role · mono Why meet | Squint hierarchy; Best only shows why |
| 2026-09-12 | Best list = one row chrome; no per-row Best pills | Mode already means Best; random pills read broken |
| 2026-09-12 | Everyone = raised rows + 10/page Prev/Next | End infinite hairline scroll; clear profile units |
| 2026-09-12 | Events/Inbox/Guests shell = max-w 1240 like Home | Phone column on desktop looked broken |
| 2026-09-12 | Person sheet = raised surface, no peach column; Why = left-rule soft wash + ink | Coral rarity; fix low-contrast Why bar |
| 2026-09-12 | Person LI/X = Focus-style min-h-11 chips under identity | Desktop orphan “LI · X” failed reach |
| 2026-09-12 | Person LI/X on desktop page = act footer (above Copy) | Left-column chips still too far from CTAs |
| 2026-09-12 | Phone Focus: scroll/swipe expands dossier (More stays) | Viewport-locked stage; More alone was easy to miss |
| 2026-09-12 | Person motion = press + Copied + 180ms enter only | Operate feedback, not delight choreography |
| 2026-09-12 | Person fields hide when empty | Empty Where/Why looked broken |
| 2026-09-12 | Inbox = Events-parity Operate list (2-col, Syne name, Why keep) | Sparse thin rows + 3-col loneliness |
| 2026-09-12 | Marketing landing = waitlist primary, demo secondary | Public actintro.com needs site + capture without full app |
| 2026-09-12 | Waitlist via Next /api/waitlist → Formspree (no Postgres revive) | Marketing-only; keep local Operate separate |
| 2026-09-12 | Landing overhaul: Focus-stage mock + 8 sections; dusk ground deepen | Fake ranked-list mock ≠ Home; actintro.com needs real Persuade depth |
| 2026-09-12 | Coral accent kept; slate field pushed deeper (`#BFC9D6`) | User OK to play with brand colors; Keep stays loud |
| 2026-09-12 | Landing narrative = match before + act after (4 steps → Inbox drafts) | Full loop; not pre-event ranking alone |

