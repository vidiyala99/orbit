# LLM calls are routed by task through one metered gateway, and the default is "don't call"

Orbit's pitch is compounding: every run gets cheaper and faster. So the LLM layer is designed with Musk's algorithm, in order: question the requirement, delete the call, simplify, accelerate, automate. The provider is OpenAI (chosen 2026-09-11; RocketRide's credits don't cover model calls). All model facts below were checked against OpenAI's docs that day.

**1. Question the requirement: the LLM doesn't rank.** Ranking is deterministic: hotdata relevance plus HydraDB graph boosts. The LLM only writes text a human will read (Struggle options, "why meet", email drafts) and does Cognee's extraction.

**2. Delete calls.**
- "Why meet" is generated lazily for the cards the user is about to see (the current card plus a prefetch of the next few), never for all 150 guests.
- A Role that's been seen before gets its Struggle options replayed (Rote), with 0 calls.
- A Playbook replay only fills personalized slots (name, company, hook). The structure comes from the captured play.
- Re-syncing an unchanged Attendee (same content hash) isn't re-sent to Cognee.
- Structured outputs remove parse-failure retries.

**3. Simplify: one gateway, one routing table, two tiers.** Every call names a task, and the gateway maps task → tier → model:

| Tier | Model | Price in/out per 1M tokens | Tasks |
|---|---|---|---|
| fast | `gpt-5.6-luna` | $0.20 / $1.20 | Struggle options, "why meet" batches, replay slot-fill, Cognee extraction |
| smart | `gpt-5.6-terra` | $2 / $12 | Reasoned outreach draft (run #1, user-facing quality) |
| embed | `text-embedding-3-small` (1536-d) | $0.02 | Cognee and hotdata vectors |

Escalation rule: if a fast-tier output fails schema validation, retry once on smart, then fall back to a template. Model ids are code defaults, overridable by env but not required in it.

**4. Accelerate: batch and cache.**
- One call returns "why meet" for a small batch of Attendees. One Cognee `remember` per event, not per person.
- Prompts are laid out static-first so OpenAI's automatic prefix caching can hit: instructions + output schema → the user's Focus → the event summary → the variable Attendee batch last.
- `prompt_cache_key` is set per user and task (OpenAI recommends it to keep cache accounting per user).
- Verified: caching starts at 1,024 prompt tokens for GPT-5.6+, the 5.6 TTL is 30m, and cached input costs 0.1× the normal rate.
- Prompts are *not* padded just to reach the cache threshold. If a prompt is short, it's already cheap. Caching is a bonus. Deleting calls and replaying Playbooks are the main savings.

**5. Automate: the meter is the product.** The gateway records every call: task, model, input/cached/output tokens (read from the usage object's cached-tokens detail), latency, and run id. That feeds the run #1 vs #N panel automatically. A per-run budget (max calls and tokens) stops runaway loops.

Consequence: Cognee runs in its own process with its own LLM config (ADR-0002), so its extraction tokens are metered by Cognee, not by Orbit's gateway. ScrapeGraphAI is different: it calls OpenAI in-process, so it takes its model from the gateway's routing table (`profile_extraction`, fast tier) and reports its usage into the run's meter (`record_external_usage`). The compounding panel covers action runs, which is where the replay savings show up. Reasoning effort: the fast tier uses the lowest effort the model accepts. Verified 2026-09-11 by `scripts/llm-smoke.sh`: `gpt-5.6-luna` accepts `none`, which is the fast-tier default. The smart tier defaults to `medium`; terra's accepted values haven't been exercised live yet. Both are overridable by env (`LLM_FAST_REASONING_EFFORT`, `LLM_SMART_REASONING_EFFORT`).
