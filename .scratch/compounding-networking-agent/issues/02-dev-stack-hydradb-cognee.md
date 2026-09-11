# 02: Dev stack: HydraDB + Cognee services

Type: task (prefactor)

**What to build:** One command brings up everything the sponsor stack needs locally, beyond today's db/backend/frontend: the open-source HydraDB node (Docker, Bolt/Cypher, auth token, persistent data dir) and the Cognee service (its own environment or container, REST, configured for the chosen LLM + embedding provider, per ADR-0002). The start script health-checks both, and stop/reset handle them. Each gets a live smoke check. Env vars are documented in the example env with blank placeholders.

**Blocked by:** None (can start immediately). Cognee's LLM config needs the LLM provider key; HydraDB doesn't.

**Status:** ready-for-agent

- [ ] Dev start launches HydraDB and Cognee (or reports clearly why not) and waits until both are ready
- [ ] HydraDB smoke check: write a node over Bolt, read it back with Cypher (a listening port isn't proof)
- [ ] Cognee smoke check: remember a small document, then recall a fact from it
- [ ] Embedding dimension measured once and pinned in Cognee config
- [ ] Orbit's backend dependency pins are unchanged (Cognee's dependencies stay isolated)
- [ ] Existing test suite still green
