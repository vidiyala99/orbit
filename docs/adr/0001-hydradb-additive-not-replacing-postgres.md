# HydraDB stores the derived memory graph only; Postgres stays system-of-record

Orbit's `User`/`Person`/`Event`/`SyncRun` data already lives in Postgres (auth, sessions, CRUD) and works. For the hackathon's Compound Agents stack, HydraDB is introduced as an *additional* store — the durable home for the Cognee-derived Attendee/Company/Skill/Event/Role/Struggle graph — not a replacement for Postgres. A full migration off Postgres was considered and rejected: it would burn hours of an 8-hour build re-plumbing working auth/CRUD paths for zero demo-visible benefit, since the thing judges need to see (multi-hop relationship queries, graph-backed muscle memory) only requires HydraDB to hold the *derived* graph, not the source-of-truth rows.

Consequence: any given fact may exist in both stores (e.g. an attendee's name in Postgres, and as a graph node in HydraDB) — this is deliberate duplication across a memory-vs-system-of-record boundary, not drift to reconcile.
