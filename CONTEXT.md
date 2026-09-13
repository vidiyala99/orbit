# Actintro

Your personal matchmaking and communication assistant for events: pull real Luma guests, rank them against your Focus, stash who matters, then act on the intro.

_(Internal/code alias: Orbit may still appear in paths and older comments.)_

## Language

**Event**:
A Luma gathering the signed-in user is tracking, with a live guest list.
_Avoid_: Meetup (generic), room

**Attendee**:
Someone on an Event's guest list. On **Home** they appear one-at-a-time in the Focus triage queue (ranked shortlist for the active Event). On **Events** (`/events`, then `/events/:id`) the full guest list for a room is searchable (e.g. type a company name to find people). Attendees is a UI pattern under an Event — not a peer tab.
_Avoid_: Candidate, contact (until they land in Inbox), guest (UI label only)

**Events** (tab):
Room picker for synced Events (past + live). Tap a room → guest search for catch-up browsing. Route: `/events`.
_Avoid_: Calendar, schedule, meetup list

**Inbox**:
The saved set of Attendees the user committed to (Keep). From here they pick the next action — not a send channel. Route: `/inbox`. Person detail: `/people/:id`.
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
Turning an Attendee's handles into a Profile: agents fetch public pages and extract structure (what they’re building, funding, accolades, pain, how to approach). Runs **after Keep** for depth — not mass-scrape of Everyone. Focus cards stay honest (“not researched yet”) until then.
_Avoid_: Scraping (the mechanism, not the concept), lookup, rank

**Focus**:
What the signed-in user is trying to get out of an event, in two parts: what they do (**Role**) and what they're struggling with right now (**Struggle**). It's inferred from the user's own Profile and confirmed or edited in one tap, never typed into an onboarding form. Domain-agnostic: a Role can be "backend engineer", "seed investor", or "rock climber". On **Home**, Focus triage runs for the **active room** (soonest in-window Event with guests). Rank is a blend of Focus fit, **Situation**, and **Evidence** — never title alone.
_Avoid_: Job Target, target role/industries (old, job-hunt-specific naming)

**Situation**:
Why an Attendee might matter for this user's Focus, beyond topic overlap. Primary Situations for a job-seeking Focus: **hiring power** (can open a seat, even without saying “hiring”), **peer / recently hired** (path advice), and **warm intro / referral**. Others (builder peer, investor/advisor, buyer) turn on when Struggle implies them. Until Enrichment, light heuristics may propose Situations; they never override strong Focus fit or weak Evidence by themselves.
_Avoid_: Signal chip (UI label), title (one weak prior)

**Evidence**:
How grounded a match is: Luma bio alone is thin; a researched **Profile** is strong. Noise (tag-pile bios, no social proof) stays off Focus.
_Avoid_: Confidence score (implementation), scrape success

**Role**:
One half of Focus: what the user does, in free text.
_Avoid_: Job title (too narrow, since a Role isn't necessarily employment)

**Struggle**:
The other half of Focus: what the user hopes to solve by attending, always stated in relation to their Role.
_Avoid_: Pain point, goal (too vague)

**Connect**:
The one-time (or rare) handshake that links the signed-in user's Luma account to Actintro. The user only provides email and a 6-digit code — never cookies, magic links, or a babysat browser.
_Avoid_: Sync (pulling events), login (Actintro auth), OAuth

**Luma session**:
The durable credential Actintro keeps after Connect, equivalent to staying logged in on Edge across restarts. One session covers the whole Luma account: Sync discovers Going **Events** (including new RSVPs) until Luma invalidates the session. Re-Connect is only when that happens — soft prompt for another code, not a dead empty Home.
_Avoid_: Per-event login, API key (optional alternate path), browser profile (implementation)

**Sync**:
Refreshing Going Events and Attendee lists using the stored **Luma session**. Happens quietly when the user opens Home or Events if the last Sync is stale; not a button users should babysit.
_Avoid_: Connect, scrape, import
