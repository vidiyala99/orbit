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

**Focus**:
What the signed-in user is trying to get out of an event, captured as two answers: what they do (**Role**) and what they're struggling with right now (**Struggle**). Domain-agnostic by design — a Role can be "backend engineer" or "seed investor" or "rock climber," and Struggle options are generated dynamically per Role rather than fixed, so the concept never assumes a job-hunting context specifically.
_Avoid_: Job Target, target role/industries (old, job-hunt-specific naming)

**Role**:
One half of Focus — a free-text description of what the user does, entered via a button-or-custom picker.
_Avoid_: Job title (too narrow — a Role isn't necessarily employment)

**Struggle**:
The other half of Focus — what the user is hoping to solve by attending, chosen from options generated dynamically from their Role, or entered as custom text.
_Avoid_: Pain point, goal (too vague — Struggle is always answered in relation to a Role)
