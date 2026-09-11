# 13: Outreach Playbooks via Rote

**What to build:** Muscle memory for outreach. When the user marks a reply on a reasoned outreach run, Orbit crystallizes that run into a Playbook through Rote and stores it: name, Rote play reference/version, source Attendee, and the profile signature it matches (role/topic/company type). When a new kept Attendee matches a Playbook, the Inbox offers "Replay Playbook". Orbit replays the captured play with the new Attendee (only personalized slots go through the gateway), and the run is recorded as `replayed`. A Playbooks list shows each Playbook with its replay count.

**Blocked by:** 01, 10

**Status:** ready-for-agent

- [ ] `playbooks` table (migration). `GET /playbooks` lists them with replay counts
- [ ] Outcome `replied` on a reasoned run crystallizes exactly one Playbook. On a replayed run it increments that Playbook's success count
- [ ] A matching Attendee's action runs `replayed` with measurably fewer LLM calls (test with Rote faked). No match falls back to reasoned
- [ ] A WORKED_FOR edge (Playbook → Attendee) is written to Memory
- [ ] Live smoke check: crystallize + replay one outreach play end-to-end through WSL
