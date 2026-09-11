# Orbit

Your personal networking agent for events: pull real Luma guests, rank them against your Focus, stash who matters, then act later.

## Language

**Event**:
A Luma gathering the signed-in user is tracking, with a live guest list.
_Avoid_: Meetup (generic), room

**Attendee**:
Someone on an Event's guest list, shown one-at-a-time on the Home focus card.
_Avoid_: Candidate, contact (until they land in Inbox), guest (UI label only)

**Inbox**:
The saved set of Attendees the user committed to (swipe-right / keep). From here they pick the next action — not a send channel.
_Avoid_: Shortlist, favorites, CRM, follow-up queue (old Home queue name)

**Playbook**:
A captured successful action sequence (what worked for a similar Attendee) that can be replayed.
_Avoid_: Template, workflow, skill

**Memory**:
Structured facts about people, events, and past outcomes that survive across sessions.
_Avoid_: Chat history, embeddings (implementation)

**Profile**:
What Orbit knows about a person from their public footprint (LinkedIn, X, personal/company/product sites): role, company, what they're building, topics, recent posts, with source links. Attendees' Profiles come from enrichment; the signed-in user has one too.
_Avoid_: Bio (just the Luma one-liner), lead, prospect

**Enrichment**:
Turning an Attendee's handles into a Profile: agents fetch their public pages and extract structure. Nobody signs up, so there's no cold start.
_Avoid_: Scraping (the mechanism, not the concept), lookup

**Focus**:
What the signed-in user is trying to get out of an event, in two parts: what they do (**Role**) and what they're struggling with right now (**Struggle**). It's inferred from the user's own Profile and confirmed or edited in one tap, never typed into an onboarding form. Domain-agnostic: a Role can be "backend engineer", "seed investor", or "rock climber".
_Avoid_: Job Target, target role/industries (old, job-hunt-specific naming)

**Role**:
One half of Focus: what the user does, in free text.
_Avoid_: Job title (too narrow, since a Role isn't necessarily employment)

**Struggle**:
The other half of Focus: what the user hopes to solve by attending, always stated in relation to their Role.
_Avoid_: Pain point, goal (too vague)
