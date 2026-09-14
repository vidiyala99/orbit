---
version: 1
slug: "frontend-app-home-page-tsx"
primary_target: "frontend/app/home/page.tsx"
related_targets: ["frontend/components/Home.tsx","frontend/components/FocusCard.tsx"]
---

# Home surface brief

Scope: signed-in Home (`/home`), Operate mode. Job: triage the active Event's ranked guests, decide Keep or Skip, open LinkedIn/X in one tap.
Approved comp: `.impeccable/mocks/home-badge-c.png` (layout C), with layout B's badge back as the flip view.
Interaction decisions (updated 2026-09-13 from user review):
- Phone: one card. Front = photo, first name (scales to fit), last name, title, chips (works-at company + signals), How to approach in full. Tap (or Space) flips to the back: Why meet, Recent, Background (About), company bullets, LinkedIn/X. Unresearched people get How to approach + Why on the back too. No expanding panel or sheet.
- Swipe browses only and the queue loops (last wraps to first). No counter or arrows on phones: swipe or tap a rail badge (ringed badge shows position).
- Keep/Skip decide and auto-advance to the next undecided person; Skip/Keep show a toast with Undo; K/S/←/→ on keyboards.
- LinkedIn/X one tap everywhere. No source tags ("Luma bio", "LinkedIn", "Company site" removed). Full profile link hidden until the person page is redesigned.
- Tablet (600-899px): the phone layout, roomier; front also shows Why, Recent and company bullets; full-width tab bar.
Desktop (comp `.impeccable/mocks/home-badge-c-desktop.png`): top nav Home/Events/Inbox; header with event and ‹ n of N ›; full-width lanyard rail; open badge holder with the LEFT card identity only (photo, name, title, chips, tier) and the RIGHT card carrying all context (How to approach, Why meet, Recent, Background, company bullets, LinkedIn/X); Skip (S) and wider Keep (K) centered below.
Comp authority (2026-09-13): the user was unsure and delegated; decided to treat the approved comps as reference, not pixel spec, because later user decisions deliberately diverge from them. Verification is multi-viewport Playwright captures plus interaction tests (e2e/badge-home.spec.ts, e2e/badge-viewports.spec.ts) and the finish reviewer.
Unresolved: thin-profile (unresearched) treatment to revisit with the user; Pending link at rail end (needs enrichment status data); Focus editor placement; desktop empty lower space on sparse profiles.

## Direction contract

THESIS: The room hangs on one lanyard in rank order; each guest is a badge you read across the room and decide in one tap. Refuses the swipe dating card and the SaaS list.

OWN-WORLD: Near-white or near-black ground following the system; off-white PVC badge cards; electric blue lanyard as the only structural colour; hot pink reserved for Keep; green tier stripe for Top match; heavy condensed first names; punch marks for kept and skipped.

STORY: See the ranked room, learn why each person matters and how grounded that is, open LinkedIn or X, Keep or Skip, act later from Inbox.

FIRST VIEWPORT: Event title with ‹ 3 of 12 ›; lanyard rail of mini badges; large active badge (swipe browses, flip shows why, company bullets, sources); Why with source; LinkedIn and X buttons; Skip and wider pink Keep; tabs.

FORM: Badge and Lanyard, pick card, seed f05f38f7.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
