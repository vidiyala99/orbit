# 14: Demo-ready

**What to build:** The submission is safe to present. The demo event's Attendees are pre-enriched before judging (with a live enrichment of a few profiles during the demo to show replay). The final Snyk scan (dependencies + code, backend + frontend) is clean. Every live smoke check is green. The demo runs end-to-end on the user's real Luma event, following the people-first story: the ranked cards of who to meet and why, then the layers underneath, then the compounding panel. Stretch if time remains: a Tulving recurring play that re-syncs, re-enriches new RSVPs, and re-ranks during the event.

**Blocked by:** 09, 12, 13

**Status:** ready-for-agent

- [ ] The user's event is fully enriched and ranked. The ranked cards and top-N list look right to the user
- [ ] Snyk scans (ticket 03's commands) show no high/critical issues
- [ ] All smoke checks pass, and each sponsor tool's contribution is visible in the demo flow
- [ ] Written demo script with the exact click path, rehearsed once end-to-end
- [ ] Full test suite green, and the diff since the baseline commit is summarised for the submission
