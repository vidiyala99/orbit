# StayConnected — Sub-project: Landing Page & Navigation

## Thesis

`/` currently renders the logged-in app board directly — no marketing layer, nothing that explains what the product is before asking someone to sign up. This sub-project builds the public-facing site: a proper home page, a dedicated "how it works" page, an about page, and the persistent navigation that ties them together, using the corkboard visual language already established for the app itself.

Reprioritized ahead of the custom-auth build (see `2026-08-19-custom-auth-design.md`) after seeing the current `/` live — it reads as broken without this.

## Scope

- Public pages: Home, How it works, About
- Persistent top navigation across all marketing pages
- The animation system described below
- Mobile-responsive layout for all three pages
- Out of scope: the auth pages themselves (covered by the custom-auth spec), the logged-in app screens (already built, corkboard-skin pass is separate follow-up work not covered here)

## Visual design system

Reuses the palette, type, and motion primitives already established for the app (see `2026-08-18-presence-plans-design.md`'s "Visual design system" section) — no new tokens introduced. Marketing pages use the calmer cream ground (`#F6F3EC`) rather than the cork-board texture (`#5B4A32`), reserving the board texture for the app itself and for accents (the hero's dark thesis-quote section, phone-mockup illustrations on How it works).

Hero direction locked via the visual-companion brainstorm (`.superpowers/brainstorm/38550-1787155772/content/hero-layout.html`, option B): centered copy, cream background, three small pinned proof-cards below the fold line.

## Navigation

Persistent top bar, same on every marketing page: logo (pin icon + wordmark), links (Home / How it works / About), and a "Try it out" CTA button, right-aligned. Sticky on scroll. Below a mobile breakpoint (< 768px), links collapse into a hamburger-triggered drawer; logo and CTA stay visible in the bar.

"Try it out" and every primary CTA ("Post your plan," "Post your first plan") link to `/sign-up`. Once auth exists, a signed-in visitor sees a different header treatment matching what's already on the app's home page today (sign-out affordance instead of sign-in/sign-up links) — no change needed here beyond what the custom-auth spec already wires into `app/page.tsx`.

Every nav link and CTA is a real `<a>`/`Link`, not a `<div onClick>` — cmd-click and middle-click must work. See Interaction States below for their focus/hover/active treatment.

## Pages

### Home (`/`)

**Cut from the earlier mockup:** the tracked-uppercase eyebrow line above the headline ("The channel AI can't fake" / "Why this exists" / "Step by step" on the three pages). It's a named default (`hero-eyebrow-chip`/`kicker-above-heading`) that was inherited from the visual-companion mockup, not derived from this subject, and the skill's own guidance is explicit that restyling a flagged eyebrow reproduces the same tell — so it's removed outright, not reworked. Its content isn't lost: "the channel AI can't fake" folds into the subhead below.

Scroll order, top to bottom:
1. **Hero** — headline ("Networking used to run on luck. Now it doesn't."), subhead ("The one channel AI can't fake: say where you'll be, get spotted by the people worth meeting, leave with a connection that outlasts a LinkedIn add."), two CTAs (primary: "Post your plan" → `/sign-up`; secondary: "See how it works" → `/how-it-works`), three pinned proof-cards (Priya S. / Dev K. / Marcus T., pulled directly from the app's own data shape — not fabricated content, same `PlanT` shape as the real board)
2. **Three-step summary** — condensed version of the same three steps detailed in full on How it works; links there via the secondary hero CTA and this section's framing, not a repeated deep-dive
3. **Thesis quote** — dark cork-textured section, pull-quote from the About page's argument, attributed "See About us"
4. **Footer CTA** — "Stop leaving it to luck," single primary button

### How it works (`/how-it-works`)

Dedicated page (not a same-page anchor — chosen so it can carry more depth than Home's condensed version and be linked to directly). Three full-width alternating rows (image-left/text-right, then flipped, then flipped again), each pairing a step with a small illustration reusing the actual app-screen mockups:
1. **Post where you'll be** — illustrated with the pinned-card composer result
2. **Get spotted before you arrive** — illustrated with the public-reply thread (two people replying under a plan)
3. **Leave with a stamp, not just an add** — illustrated with the chat bubble + stamp badge

Ends with the same footer CTA pattern as Home.

### About (`/about`)

Single-column essay layout: headline ("A cover letter used to cost something."), full thesis paragraph (the same argument already written into the Presence & Plans spec's thesis section — not a new argument, just given room to breathe here), closing pull-quote section on the cream/cork transition.

## Animation system

**Revised after an audit against the `deliberate` skill's dated-defaults list.** The first draft animated every section on scroll ("fade-up on every section" is itself a named current default) and used a generic `hover:scale-105`-style card lift — both cut. Per the skill's own decision-sheet discipline, MOTION should be a bounded *count* of specific moments, not a blanket treatment, and each moment should be justified by this subject (a corkboard, pinned physical objects) rather than being scroll-animation boilerplate. Implemented with plain CSS keyframes + `IntersectionObserver` where needed — no new animation library, matching `frontend/package.json`'s current zero-dependency baseline.

**Three moments total, matching the count already fixed in the app's own design system** (`2026-08-18-presence-plans-design.md`'s MOTION line names live-pulse, message slide-in, stamp-press — this reuses that budget rather than adding a new one):

1. **Hero entrance** (Home only, on load): headline, subhead, CTAs, and proof-cards fade+slide-up in a staggered sequence, ~150ms apart, `ease-out`, under 1s total. One-time, tied to first paint — not repeated on scroll.
2. **Stamp-press** (How it works, step 3 illustration only): reuses the app's own stamp-confirm animation (rotate to -3°, scale-in) exactly as it fires in the real product, rather than inventing a new "marketing" version of it — this is the actual signature moment, shown once per page load, not looping (a looping/pulsing badge was in the first draft and is cut — a signature element earns attention by being distinct, not by moving continuously).
3. **Pinned-card hover response** (any pinned proof-card, anywhere it appears): the card's rotation straightens toward 0° and its shadow deepens — a physical response (a pinned card lifting off the board) rather than a generic scale-up. No `scale()` transform.

Nothing else on these pages animates on scroll. Sections appear in their resting state; the reveal-everything pattern was the tell, and cutting it is the fix, not restyling it more subtly.

**Accessibility**: all three moments respect `prefers-reduced-motion: no-preference` — under reduced-motion, content and the stamp illustration appear in their resting/final state immediately.

## Interaction states

**Missing entirely from the first draft** — flagged as the highest-signal gap in a `deliberate` audit, higher than color or layout, because a screenshot can look fine while the page is inert to actually touch. Every interactive element on these pages (nav links, both CTA styles, the hamburger toggle) gets:

- **`:active`** — pointer-down feedback, not just hover: `transform: scale(0.97)` on buttons/CTA pills, ~100ms `ease-out`. Responds on press, not on click-release.
- **`:focus-visible`** — `outline: 2px solid #B8461A; outline-offset: 2px` on every link and button, keyboard-only (not on mouse click). The hamburger drawer uses `:focus-within` so the whole open group signals focus.
- **Hover** stays as already speced (nav underline, pinned-card rotation-straighten) but is no longer the *only* state — active and focus are layered on top, not instead of it.
- **The six untamed surfaces**, themed instead of left at browser defaults: `::selection` (accent-tinted, not default blue), `caret-color` (accent), `::-webkit-scrollbar-thumb` (the existing `rule` token), link `text-underline-offset`/`text-decoration-thickness`, `.tabular` class with `font-variant-numeric: tabular-nums` (used where the site shows any count, e.g. "N plans pinned near you" on the app side this links to), and `color-scheme` set on `:root`.
- **No forms live on these three marketing pages** (signup/login forms are the custom-auth spec's concern) — so disabled/loading/empty/error states aren't applicable here beyond the CTA buttons themselves, which need no disabled state since they're always-available navigation, not submissions.
- Real semantic elements throughout: `<nav>`, `<a>`/`Link` for navigation (never `<div onClick>`), `<button>` only for the hamburger toggle (an action, not navigation), heading levels that don't skip (h1 once per page, h2 for section titles), a skip-to-content link before the nav.

## Responsive strategy

Mobile-first Tailwind breakpoints. Below `md` (768px):
- Nav collapses to hamburger drawer (logo + CTA stay in the bar)
- Hero switches from centered-with-cards-below to a single stacked column: headline → subhead → CTAs → cards (cards stack vertically, still pinned/rotated)
- How it works' alternating image-left/text-right rows stack to image-above-text, uniformly (no left/right alternation on mobile — alternation is a desktop-only rhythm device)
- All section padding/type scales down using existing Tailwind responsive utilities, no new breakpoint tokens needed

## Testing

- Vitest component tests for each page: renders expected headline/CTA text, CTA links point to the right routes (real `href`s, not click handlers)
- A test for the hero-entrance stagger hook: elements start hidden, animate in on mount
- A test confirming `:focus-visible` styles and `tabIndex` are correct on nav links, CTAs, and the hamburger toggle (jsdom + testing-library's accessibility queries, not a full visual check)
- No visual-regression or animation-timing tests in v1 — motion correctness is checked by manual review (per `superpowers:verification-before-completion`, screenshot the running pages, don't just trust the code); this manual pass should also tab through every page keyboard-only and confirm the focus ring is visible at each stop

## Out of scope (v1)

- Auth pages (separate spec)
- Corkboard-skin pass on the already-built logged-in app screens (separate follow-up, not part of this sub-project)
- CMS/editable copy — all page content is hardcoded in the component, matching how the rest of the app already works
- A/B testing or analytics on the marketing pages
