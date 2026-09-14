# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who go to Luma events with something to get out of them. The starting audience is tech: builders, engineers, founders and job seekers at tech events in person. The founder is user #1 and attends tech events full time.

They use Actintro in three moments: the night before (who is worth meeting), in the room (find and approach them, usually on a phone, often in low light), and the day after (follow up while it is fresh).

## Product Purpose

Attending events should not feel scattered and unorganized. Actintro turns a Luma guest list into a short, trusted plan for the event and carries it through to real outcomes.

Success for the user, in order:
1. Walk in knowing who to meet and why.
2. Actually talk to them (recognize them, have an opener).
3. Send follow-ups after, and see which were accepted or replied.
4. Real outcomes: intros, interviews, meetings that came from the event.

## Positioning

Ranked by your Focus. Every guest on the list, including people with an empty Luma bio, is filled out from their public LinkedIn and ranked against what this user is trying to achieve, with the reason shown. Scrolling Luma or LinkedIn gives a list; Actintro gives an order and a why.

## Operating Context

- Source of events and guests: Luma. Events are imported for the user; there is no user-facing connect or sync control for now.
- Enrichment: a paced overnight worker reads each guest's LinkedIn (headline, current role and company, About) through the user's own logged-in browser, before the event.
- Typical room sizes: a few people to 500+ guests. Most guests have a LinkedIn URL; most have a blank Luma role.
- Demo login is on by default; the product is shown live at events.

## Capabilities and Constraints

- Domain terms (see CONTEXT.md): Event, Attendee, Focus (Role + Struggle), Situation, Evidence, Profile, Enrichment, Inbox, Keep/Skip.
- Keep and Skip are available on Home (guided queue), the event guest list, and the person page.
- One tap to a person's LinkedIn (and X when present) from every place a person appears: Home card, guest list row, person page, Inbox. Checking LinkedIn is often the very next move.
- Inbox holds kept people and their next action (message drafts, pending, accepted, follow up).
- Incomplete profiles are never silently dropped; they are shown as pending enrichment.
- Stack: Next.js App Router + TypeScript + Tailwind v4 frontend on Vercel; FastAPI + Postgres backend on Render. Free hosting tiers.
- Undecided: whether deep research (posts, company, funding) runs for everyone or only after Keep; X enrichment.

## Brand Commitments

- Name: Actintro. Keep and Skip as the core verbs.
- Light and dark appearance, following the phone's system setting.
- Landing page primary action: try the demo.
- No em dashes in product copy or drafted messages.

## Evidence on Hand

- Real Luma data for three past tech events: AI Security Hackathon (553 guests), Build Fridays (236), Blinkko Launch Party (3).
- 22 hand-enriched LinkedIn profiles in `.scratch/ai-security-hackathon/`.
- No customers, testimonials, usage metrics, or pricing exist. Do not invent them.

## Product Principles

1. An order and a reason, not a list. Every ranked person shows why, and how grounded that why is.
2. Honest about what is known. Thin, pending and failed data is labeled, never hidden or faked.
3. The event is a plan with a finish line: before, in the room, after.
4. Decide fast, act right away. Keep and Skip are one tap everywhere; the next action follows.
5. Works in the room: one hand, a phone, bad light, seconds of attention.

## Accessibility & Inclusion

WCAG 2.2 AA contrast in both light and dark appearance; 44px touch targets for primary actions (Keep, Skip, LinkedIn/X, tabs); secondary browse controls (queue rail badges, previous/next) at least 24px, always with an alternative (swipe or arrow keys); respects reduced motion.
