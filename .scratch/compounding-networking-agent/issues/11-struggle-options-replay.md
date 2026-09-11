# 11: Struggle-options replay

**What to build:** The second Rote moment. When a Role that Orbit has already generated Struggle options for comes up again, the options come from a replayed Rote play instead of a fresh LLM generation. The response says `source: "replayed"`, the LLM-call meter shows zero calls for that request, and the onboarding page feels instant.

**Blocked by:** 01, 04

**Status:** ready-for-agent

- [ ] First request for a Role returns `source: "generated"` and records its LLM calls. A later request for an equivalent Role returns `source: "replayed"` with no LLM calls
- [ ] Custom Struggle entry still works whatever the source
- [ ] API test with Rote and the gateway faked
