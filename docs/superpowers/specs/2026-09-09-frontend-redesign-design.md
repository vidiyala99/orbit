# Orbit Frontend Redesign — Design Spec

**Date:** 2026-09-09
**Status:** Approved for planning
**Owner (execution):** `designer` subagent (visual/CSS layer), `frontend-engineer` subagent (any data/state wiring the redesign touches), `qa-engineer` (gate before done)

## Why

The current "Field Notebook" identity (warm paper/ink palette, Fraunces/Manrope/Plex Mono/Caveat type stack, defined in `frontend/tailwind.config.ts`) is not responsive-safe: prior sessions found duplicate-text and truncation bugs at 390px across the landing/home/attendees pages, and multiple ad-hoc patches (stamp motif removal, avatar restyling, chevron/arrow visibility fixes) have been layered on top of it reactively. The user's call: stop patching a design that fights small screens — replace the identity and rebuild the layout/responsive architecture underneath it together, rather than continuing incremental fixes.

## Scope

**In scope — every page in `frontend/app/`:**
- Marketing: `page.tsx` (landing), `about/`, `how-it-works/`
- Auth: `sign-in/`, `sign-up/`, `onboarding/`, `forgot-password/`, `reset-password/`, `verify-email/`
- App (behind the bottom `AppNav` tab bar, per `CLAUDE.md` the only two real destinations): `home/`, `attendees/`

**Out of scope:**
- Backend routers, API contracts, data shapes — this is a visual/layout rebuild only. `frontend-engineer` is looped in only if a layout change requires restructuring how a page fetches/holds state (not the data itself).
- The Luma auto-login and LinkedIn/X enrichment workstreams — separate specs, separate approval gates (per user decision to sequence redesign first).
- `try/` page — legacy per prior-session flags on `APP_HOME`/`try` references; not touched unless the redesign surfaces it needs removal, which would be called out separately.

## Design skill guidance applied

Per the user's standing rule, `ui-ux-pro-max`, `taste-redesign`, `impeccable`, and `emil-design-eng` were loaded before this spec was finalized (not as a post-hoc check):

- **Mode split (impeccable):** marketing/auth pages are **Persuade** surfaces (visitor decides and acts — earn attention) and `/home`/`/attendees` are **Operate** surfaces (visitor completes a task — scanability and consistency outrank expression). The new identity must read as one system but each page's priorities follow its mode, not a single template stamped everywhere.
- **This is a redesign, not a refinement (impeccable):** the old field-notebook look is evidence/anti-reference, not something to preserve. Product truth (copy, functionality, routes) carries over; the visual world does not.
- **Fix-priority order (taste-redesign):** font swap → color palette → hover/active states → layout/spacing/responsive grid → replace generic components → loading/empty/error states → typography polish. The designer should work in roughly this order per page so early passes aren't invalidated by later token changes.
- **Motion (emil-design-eng):** UI animations stay under 300ms, use `ease-out` for entrances, animate only `transform`/`opacity`, respect `prefers-reduced-motion`, and stagger multi-element entries (30-80ms) rather than mounting everything at once.

## Approach

1. **New visual identity, chosen not voted on.** The user explicitly delegated tone/mood to the design skills rather than picking from directions. The `designer` subagent researches the in-person-networking-app space using `ui-ux-pro-max` (palette/type-pairing data), `taste-core`/`taste-redesign`, `impeccable`, and `emil-design-eng` (per the user's global rule: load all of these before any mockup/frontend work), and commits to **one** direction with a short rationale — not a menu of options.
2. **Checkpoint before code.** The designer reports its chosen direction + rationale (palette, type pairing, one signature motif, layout principles) in chat before writing any files. This is the single approval gate before implementation begins.
3. **Live-only iteration — no throwaway Artifact mockups.** All work happens directly in `frontend/app` and `frontend/components` against the real dev server (`scripts/dev.sh`, port 3000). The designer uses Playwright MCP to screenshot real pages at three breakpoints — 390px (mobile), 768px (tablet), 1440px (desktop) — as its own feedback loop while iterating, and reports back with real screenshots at natural checkpoints (e.g., after marketing pages, after auth pages, after app pages) rather than one big reveal at the end.
4. **Token rebuild first, pages after.** `tailwind.config.ts`'s color/type/shadow tokens get replaced as the foundation; every page then gets rebuilt against the new tokens rather than patched in place, since the tokens and the responsive layout are being redone together.

## Architecture / components

- **Design tokens:** `frontend/tailwind.config.ts` — new `colors`, `fontFamily`, fluid `fontSize` (clamp-based scale already exists as a pattern worth keeping — the fluid-scale *mechanism* isn't the problem, the tokens plugged into it are), `borderRadius`, `boxShadow`. Fonts loaded via `next/font` in `layout.tsx` as today; specific families chosen by the designer's research, not prescribed here.
- **Shared components:** `frontend/components/` (`MarketingNav`, `Reveal`, `AppNav` bottom tab bar, and whatever else the designer finds) get rebuilt against new tokens once, then pages consume them — not per-page reinvention.
- **Responsive architecture:** every page must be verified at all three breakpoints before being marked done. The specific layout strategy (stack order, nav collapse behavior, card vs. list) is the designer's call per page, informed by its research, but must be Tailwind's real responsive utilities (`sm:`/`md:`/`lg:` or the existing fluid-clamp pattern) — not fixed pixel layouts that happen to look right at one width.

## Error handling / edge cases

- Empty states (no events, no attendees) and truncation (long names/bios) must be handled per page — this project has been burned by both before (per session history: duplicate text, truncation at 390px).
- `prefers-reduced-motion` respected on any new motion; animate only `transform`/`opacity` (carried over from the `designer` agent's existing conventions).
- Every interactive element keeps a visible `focus-visible` state.

## Testing

- `cd frontend && pnpm test` (vitest) must pass before any page is reported done.
- `tsc` must be clean.
- Playwright MCP screenshots at 390px/768px/1440px are the acceptance evidence per page — not optional, not deferred to a later QA pass.
- `qa-engineer` gates final completion per the existing graph discipline before the orchestrator commits/reports the workstream done.

## Process notes (not part of the visual spec, but binding)

- This work is delegated to the `designer`/`frontend-engineer` subagents per the standing "local work must be fully agentic" rule — the top-level assistant does not edit these files directly.
- Specialists commit locally only; no push, no PR — that's the orchestrator's step after QA passes, and merge/deploy still needs the user.
- This is workstream 1 of 3 (redesign → Luma auto-login → LinkedIn/X enrichment), tracked on the "Orbit Dev Log" artifact.
