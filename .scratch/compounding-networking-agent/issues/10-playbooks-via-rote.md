# 10: Playbooks via Rote

**What to build:** Muscle memory for outreach. When the user marks a reply on a reasoned run, Orbit crystallizes that run into a Playbook through Rote and stores it: name, Rote play reference/version, source Attendee, and the Role/Struggle signature it matches. When a new kept Attendee matches a Playbook, the Inbox offers "Replay Playbook". Orbit replays the captured play with the new Attendee (only the personalized parts go through the LLM gateway), and the run is recorded as `replayed`. A Playbooks list shows each Playbook with its replay count. The mechanism follows ticket 01's findings.

**Blocked by:** 01, 08

**Status:** ready-for-agent

- [ ] `playbooks` table (migration). `GET /playbooks` lists them with replay counts
- [ ] Outcome `replied` on a reasoned run crystallizes exactly one Playbook. On a replayed run it increments that Playbook's success count instead
- [ ] A matching Attendee's action runs in `replayed` mode with measurably fewer LLM calls than the reasoned run (asserted in a test with Rote faked at the adapter)
- [ ] No match falls back to a reasoned run
- [ ] A WORKED_FOR edge (Playbook → Attendee) is written to Memory
- [ ] Live smoke check: crystallize + replay one play end-to-end through WSL
