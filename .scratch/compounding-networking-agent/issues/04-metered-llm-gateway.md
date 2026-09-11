# 04: Metered LLM gateway

Type: task (prefactor)

**What to build:** The single path from Orbit to an LLM, built to ADR-0003. Every call names a task, and a routing table maps task → tier → model (fast `gpt-5.6-luna`, smart `gpt-5.6-terra`, embeddings `text-embedding-3-small`). It uses structured outputs, a static-first prompt layout with `prompt_cache_key`, fast→smart escalation on schema failure, and a per-run budget. Every call is recorded (task, model, input/cached/output tokens, latency) against a new `action_runs` row. Usage reported by external extractors (e.g. ScrapeGraphAI) can be recorded through the same meter. A live smoke check makes one real completion and one embedding.

**Blocked by:** None (can start immediately). Needs the OpenAI key for the smoke check only.

**Status:** ready-for-agent

- [ ] `action_runs` table (migration) with run id, kind, mode, status, duration, llm_calls, tokens in/cached/out
- [ ] Gateway API: a completion (task, schema, run id) and embeddings. The routing table and model ids are code defaults, overridable by env
- [ ] Schema-invalid fast-tier output retries once on smart, then returns a typed failure. The per-run budget is enforced
- [ ] Cached tokens are read from the provider's usage details and recorded
- [ ] Unit/API tests with the OpenAI client faked at the boundary. Live smoke script
