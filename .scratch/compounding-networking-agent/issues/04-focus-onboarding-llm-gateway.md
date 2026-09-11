# 04: Focus onboarding + metered LLM gateway

**What to build:** A new user sets their Focus in two button-style pages. Role: preset buttons plus a custom field, domain-agnostic. Struggle: options generated for that Role by the LLM, plus a custom field. The Focus is saved and editable later, and it replaces the job-target editor in the UI. All LLM calls go through a single provider-agnostic LLM gateway (OpenAI-compatible) that records calls and tokens against a run in a new `action_runs` table. This is the meter the compounding panel will read.

**Blocked by:** 00. Needs the OpenAI key.

**Status:** ready-for-agent

- [ ] Users have Focus Role and Struggle fields (migration). Legacy job-target columns are left in place, unused
- [ ] `PATCH /me/focus` saves Role + Struggle. `POST /focus/struggle-options` returns generated options with `source: "generated"`
- [ ] Onboarding shows Role then Struggle pages (button-or-custom). Focus is editable afterwards. The job-target editor is gone from the UI
- [ ] Gateway follows ADR-0003: task → tier → model routing table (fast `gpt-5.6-luna`, smart `gpt-5.6-terra`), structured outputs, static-first prompt layout with `prompt_cache_key`, fast→smart escalation, per-run budget
- [ ] Every gateway call records task, model, input/cached/output tokens, and latency against an `action_runs` row
- [ ] API tests with the gateway faked at its boundary. Component tests for both pages. The old job-target editor tests are replaced
- [ ] UI copy uses Focus / Role / Struggle (CONTEXT.md)
