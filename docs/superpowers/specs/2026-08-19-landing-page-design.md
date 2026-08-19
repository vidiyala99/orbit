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

## Pages

### Home (`/`)

Scroll order, top to bottom:
1. **Hero** — eyebrow ("The channel AI can't fake"), headline ("Networking used to run on luck. Now it doesn't."), subhead, two CTAs (primary: "Post your plan" → `/sign-up`; secondary: "See how it works" → `/how-it-works`), three pinned proof-cards (Priya S. / Dev K. / Marcus T., pulled directly from the app's own data shape — not fabricated content, same `PlanT` shape as the real board)
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

Single-column essay layout: eyebrow, headline ("A cover letter used to cost something."), full thesis paragraph (the same argument already written into the Presence & Plans spec's thesis section — not a new argument, just given room to breathe here), closing pull-quote section on the cream/cork transition.

## Animation system

Implemented with plain CSS keyframes + `IntersectionObserver` (no new animation library — keeps the dependency surface matching what's already in `frontend/package.json`, which has none today):

- **Hero entrance**: eyebrow, headline, subhead, CTAs, and proof-cards each fade+slide-up (`translateY(10px)→0`, opacity `0→1`) in a staggered sequence on mount, ~150ms apart, `ease-out`, total sequence under 1s
- **Scroll-triggered reveals**: every section below the hero (three-step summary, thesis quote, footer CTA on Home; each step row on How it works; the closing quote on About) starts at `opacity:0; translateY(10px)` and animates to resting state the first time it enters the viewport, via a shared `useScrollReveal` hook wrapping `IntersectionObserver`
- **Stamp-press moment**: on How it works only, the stamp badge in step 3's illustration loops a gentle pulse (`scale(1)→scale(1.15)→scale(1)`) — the one continuously-animating element on the page, deliberately, since it's the actual product signature and should draw the eye
- **Micro-interactions**: button hover/press states (existing Tailwind `hover:`/`active:` utility patterns), nav link underline on hover, proof-card hover lift (`scale(1.04)`, shadow increase, rotation resets to 0°)
- **Accessibility**: every animation above is wrapped in a `prefers-reduced-motion: no-preference` media guard — under reduced-motion, content appears in its resting state immediately, no transitions play

## Responsive strategy

Mobile-first Tailwind breakpoints. Below `md` (768px):
- Nav collapses to hamburger drawer (logo + CTA stay in the bar)
- Hero switches from centered-with-cards-below to a single stacked column: eyebrow → headline → subhead → CTAs → cards (cards stack vertically, still pinned/rotated)
- How it works' alternating image-left/text-right rows stack to image-above-text, uniformly (no left/right alternation on mobile — alternation is a desktop-only rhythm device)
- All section padding/type scales down using existing Tailwind responsive utilities, no new breakpoint tokens needed

## Testing

- Vitest component tests for each page: renders expected headline/CTA text, CTA links point to the right routes
- A test for the `useScrollReveal` hook: elements start hidden, become visible once `IntersectionObserver` reports intersection (mocked in jsdom, which has no real `IntersectionObserver`)
- No visual-regression or animation-timing tests in v1 — motion correctness is checked by manual review (per `superpowers:verification-before-completion`, screenshot the running pages, don't just trust the code)

## Out of scope (v1)

- Auth pages (separate spec)
- Corkboard-skin pass on the already-built logged-in app screens (separate follow-up, not part of this sub-project)
- CMS/editable copy — all page content is hardcoded in the component, matching how the rest of the app already works
- A/B testing or analytics on the marketing pages
