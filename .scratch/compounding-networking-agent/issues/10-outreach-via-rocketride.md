# 10: Outreach via RocketRide

**What to build:** From the Inbox the user asks Orbit to reach out to a kept Attendee. A RocketRide pipeline on the local engine calls Orbit's agent endpoints: context (enriched profile + graph facts + insight evidence), then draft (through the metered gateway, smart tier). It returns an intro email draft. The user reviews and edits it, then approves the send. Resend delivers it only to allowlisted recipients. The run is recorded as `reasoned` with duration, LLM calls, and tokens, and a CONTACTED edge is written to Memory. The user can later mark a reply, which writes GOT_REPLY.

**Blocked by:** 04, 08. Needs the RocketRide key and a running local engine.

**Status:** ready-for-agent

- [ ] Agent endpoints (`/agent/context/{person_id}`, `/agent/draft`, `/agent/send`) behind normal auth. Draft calls are metered to the run id
- [ ] `POST /people/{id}/actions` starts a run via the Motion adapter. `POST /actions/{run_id}/send` sends the approved draft. `POST /actions/{run_id}/outcome` records a reply
- [ ] Non-allowlisted recipients are refused with a clear error. Nothing sends without explicit approval
- [ ] Inbox UI: request draft → edit → approve/send → mark replied
- [ ] API tests with RocketRide, Resend, and Memory faked. Live smoke check: engine ping + one pipeline run
