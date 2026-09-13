# Match rank blends Focus fit, Situation, and Evidence — not titles alone

## Status

Accepted (2026-09-12)

## Context

Embedding cosine vs Focus Struggle misses people who never say “hiring” but can still hire, refer, or share a path (recently hired peers, warm intros). A temporary founder/CEO title boost surfaced some of them for a demo room, but title→rank is the wrong product model: possibilities are multi-factor, and deep research cannot run on all ~500 guests.

Alternatives considered:

1. **Title-only / hiring keywords only** — fast, wrong; misses peers and intro paths; over-promotes every “Founder”.
2. **Pure FocusFit embeddings until Enrichment ships** — honest but under-ranks Situations Luma text doesn’t encode.
3. **Mass Enrichment on Sync** — richest cards; cost, ToS, and latency blow up on large rooms.
4. **Multi-factor blend + staged research** — rank from Focus fit + Situation priors + Evidence; deep Profile only after Keep.

## Decision

- **Rank** ≈ Focus fit + Situation + Evidence − noise. No single axis (including title) defines Top match.
- **Primary Situations** for a job-seeking Focus: hiring power, peer / recently hired, warm intro / referral. Other Situations activate when Struggle implies them.
- **Enrichment** (funding, accolades, product, pain, approach) runs **after Keep**. Focus may show honest “not researched yet.”
- Until Enrichment exists, **small heuristic priors** (e.g. founder/CEO → hiring-*candidate*, community → intro-*candidate*) may nudge Situation. They must not alone promote weak Evidence / tag-pile guests into Focus, and must not override strong Focus fit.

## Consequences

- Signal chips remain a coarse UI vocab over Situations, not the ranker.
- Ticket 05 (Enrichment agents) becomes the Evidence path for Keeps; ranking code should grow Situation weights as Profiles appear.
- Demo title boosts stay labeled as temporary priors, not ADR-level product truth beyond this hybrid rule.
