# LinkedIn Enrichment Worker — Design

Status: needs-triage (design only, no code). Date: 2026-09-13.
Supersedes the "enrich after Keep" part of ADR-0005 for **light** profile fields. ADR-0005 needs an amendment (see §12).

## 1. Problem (from production, 2026-09-13)

- 792 Person rows across 3 Events. 663 unique LinkedIn slugs. 474 unique slugs belong to guests with a **blank Luma role**.
- Every blank-role guest has `priority = later` (575 rows). Home's Focus filter (`frontend/lib/events.ts:284-300`) keeps only `needs_you`/`high` or hiring titles. So these guests never appear, even when LinkedIn says exactly what they do.
- Ranking is barely running in production. Only 25 of 792 rows have a `score`.
  - Build Fridays has 31 `needs_you` rows with `score = null` and no evidence.
  - AI Security has 10 `needs_you`, 4 of them unscored.
  - `rank_event` caps `needs_you` at 5 per event (`matchmaking.py:24,89`), so it can produce at most 15 across 3 events. The 42 seen came from outside the ranker: priority set via `PATCH /people/{id}` / import, or a direct DB write. `later` is the default, not a ranking result.
- The only enrichment so far ran by hand for 22 profiles (`.scratch/ai-security-hackathon/`). It produced `raw-li/*.txt` page dumps and `structured/*.json` with `headline`, `about`, `current_role` and `current_company`. It was never pushed to prod.

## 2. Goals / non-goals

Goals
- Every guest with a LinkedIn URL gets headline, current title, current company and About. Blank-role guests go first.
- Runs overnight on the user's laptop through their logged-in browser, at about 60s per profile, one page load each.
- One fetch per unique slug, reused across every Event that person attended.
- Re-rank after enrichment, so thin-bio guests compete on real information.
- Nobody is silently dropped. Unenriched guests show an explicit status.

- Every enriched person's current company gets a 3-4 bullet company brief from its public website (§6b), used in ranking.

Enrichment tiers (user decision, 2026-09-13)

| Tier | Who | What | Where it runs |
|---|---|---|---|
| Light profile | everyone with a LinkedIn URL | headline, current title, current company, About | laptop worker, logged-in browser, ~60s each |
| Company brief | every distinct current company from the light tier | 3-4 bullets from the company's own public site | server, no LinkedIn auth (§6b) |
| Deep research | people the user Keeps (+ optionally top N per upcoming event, open question) | recent posts, comments, activity, X | laptop worker, logged-in browser, ~3-5 min each; separate ticket |

Non-goals (this ticket)
- Experience history, skills, education. Deep research (posts, comments, activity, X) is its own ticket.
- Server-side LinkedIn fetching, or any LinkedIn cookie leaving the laptop. LinkedIn company and profile pages mostly show an auth wall when logged out, so company briefs come from company websites, not LinkedIn.
- Solving CAPTCHAs or bypassing checkpoints. The worker stops instead.
- Connect/sync UI (the user decided against it).

## 3. Data model

New table `linkedin_profiles`, one row per (user, slug), shared across Events:

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | fk users | owner |
| slug | str(100) | normalized: lowercase, strip `https://(www.)linkedin.com/in/`, trailing `/`, query. Unique with user_id |
| status | str(16) | `pending` \| `done` \| `failed` \| `unavailable` |
| status_reason | str(40) null | `not_found`, `restricted`, `private`, `auth_wall`, `extract_error`, … |
| attempts | int | incremented per failed try; `failed` becomes terminal at 3 |
| headline | str(300) null | |
| current_title | str(160) null | |
| current_company | str(160) null | |
| about | text null | capped at 2,000 chars |
| location | str(160) null | free with the top card |
| source | str(40) | `linkedin_dom`, `linkedin_llm`, `dump_2026-09-13` |
| source_url | str(255) | final URL after redirects |
| content_hash | str(64) | sha256 of normalized extracted fields; unchanged means no rerank needed |
| fetched_at | timestamptz null | freshness |
| enriched_at | timestamptz null | last successful write |
| created_at / updated_at | timestamptz | |

`people` gets `linkedin_slug str(100) null, indexed`. It is backfilled from `linkedin_url` in the migration and set on every create/update. A `pending` profile row is created for every new slug.

API shape (`PersonOut`) gains:
- `profile`: `{status, headline, current_title, current_company, about, fetched_at, source}` or null
- `completeness`: computed, never stored:
  - `enriched`: profile done
  - `pending`: slug present, status pending or failed with attempts < 3
  - `unavailable`: profile unavailable or failed terminal
  - `luma_only`: no LinkedIn URL

`Person.role` is **never overwritten** (it is Luma provenance). Display code uses `current_title @ current_company`, then `headline`, then the Luma role.

Why a separate table rather than columns on `people`: 792 rows map to 663 slugs. One fetch, one write, and every Event row sees the same profile.

## 4. Ingestion API (FastAPI, `routers/enrichment.py`)

Auth: a dedicated worker token, not demo-login. Demo-login is a hackathon convenience, and `render.yaml` regenerates `JWT_SECRET`, which would invalidate a saved JWT.
- `ENRICHMENT_WORKER_TOKEN` (random 32+ bytes) and `ENRICHMENT_WORKER_USER_EMAIL` on Render. The worker sends `Authorization: Bearer <token>`, and the server compares with `hmac.compare_digest`.
- The token only grants the three endpoints below. It lives in the laptop's `backend/.env.worker` (gitignored).

Endpoints
- `GET /enrichment/queue?limit=500` returns `[{slug, linkedin_url, name, luma_role, event_ids, next_event_starts_at, attempts}]` where status is `pending` or (`failed` and attempts < 3). Order:
  1. blank Luma role first
  2. guests of the soonest upcoming or most recent Event first
  3. fewer attempts first
  4. slug (stable)
- `POST /enrichment/results` takes a batch of at most 25 `{slug, status, status_reason?, headline?, current_title?, current_company?, about?, location?, source, source_url, fetched_at, raw_text?}`.
  - Idempotent upsert on (user_id, slug). The same `content_hash` means a no-op, so re-sending an outbox is safe.
  - `failed` increments `attempts`; `done` resets it.
  - `raw_text` (at most 4KB: top card + About text) is accepted only when DOM extraction missed title or company. The server then runs `Task.PROFILE_EXTRACTION` through the metered gateway (ADR-0003) and **discards** `raw_text` after extraction.
  - Returns `{upserted, unchanged, extracted_by_llm, errors:[{slug, detail}]}`.
- `POST /enrichment/rerank` takes `{event_ids?: [...]}` (default: every Event with profiles changed since its last rank). Runs `rank_event` per Event and returns per-event counts. It is also callable by the normal user.

## 5. Worker (`backend/scripts/enrich_linkedin.py`, runs on the laptop)

Browser
- Attach to the user's already-open Edge: `msedge --remote-debugging-port=9222`, logged into LinkedIn. Use Playwright `chromium.connect_over_cdp("http://127.0.0.1:9222")`.
- Work in **one dedicated tab**. Never read cookies; the session stays inside the browser.

Loop

```
preflight: CDP reachable? open linkedin.com/feed → not auth wall? API reachable (warm Render, retry 90s)?
queue = GET /enrichment/queue (once per run; cache in checkpoint)
for item in queue minus checkpoint.done:
    if now > stop_at or processed >= nightly_cap: break
    goto https://www.linkedin.com/in/<slug>/  (wait domcontentloaded + top-card selector, 20s timeout)
    state = classify(page)          # ok | not_found | restricted | auth_wall | checkpoint | captcha | rate_limited
    if state in {auth_wall, checkpoint, captcha, rate_limited}: STOP(reason)
    result = extract(page, state)   # §6
    append result to outbox.jsonl; checkpoint[slug] = status
    flush outbox every 10 results or 5 min (POST /enrichment/results; keep on failure, retry with backoff)
    sleep(pace())
end: flush outbox; POST /enrichment/rerank; print summary
```

Stop conditions (hard stop: flush, checkpoint, exit non-zero with a reason; no automatic retry)
- URL matches `/authwall`, `/login`, `/uas/login`, `/checkpoint/`, or a `challenge` path
- A CAPTCHA or "security verification" iframe or text
- HTTP 429 or 999 on the navigation response, or a "too many requests"/"unusual activity" banner
- 3 consecutive `extract_error`s (the DOM probably changed; don't burn the queue)
- 3 consecutive navigation timeouts (network or browser issue)

Per-profile (non-stop) outcomes
- "This page doesn't exist" / 404 gives `unavailable(not_found)`
- "LinkedIn Member" / out-of-network limited view gives `unavailable(restricted)`, keeping the headline if visible
- A timeout on one profile gives `failed(timeout)`, retried on a later night

Pacing (mean about 60s per profile)
- Navigation plus extraction takes about 6–10s, then a dwell of `uniform(40, 70)s`.
- Every 25–35 profiles (randomized), a break of `uniform(3, 8)` minutes.
- Optional light human noise: scroll to About (needed anyway to render it), with no clicks elsewhere.
- Defaults: `--nightly-cap 300`, `--stop-at 07:00` local, `--limit` for smoke runs, `--dry-run` (no POST).

Resumability
- `.run/enrich/checkpoint.json` holds `{run_id, started_at, queue_snapshot, done:{slug:status}}`.
- `.run/enrich/outbox.jsonl` holds unsent results. Both are gitignored.
- A re-run resumes: the outbox flushes first, then it skips slugs in `done`.
- The server stays the source of truth. A stale checkpoint is harmless because the upsert is idempotent.

Reuse the existing 22
- `backend/scripts/import_scratch_profiles.py` reads `.scratch/ai-security-hackathon/structured/*.json` (`headline`, `about`, `current_role`, `current_company`, `_meta.linkedin_url`, `_meta.extracted_at`).
- It POSTs them with `source=dump_2026-09-13` before the first night, so those 22 slugs leave the queue.

## 6. Extraction: DOM first, LLM fallback

| | DOM selectors | LLM over page text |
|---|---|---|
| Cost | $0 | about 3–5k input tokens per profile on the fast tier; well under $1 for all 641 even if every profile fell back (to confirm against `llm/` routing prices) |
| Speed | instant | 1–3s server-side |
| Fragility | breaks when LinkedIn changes markup | robust to markup changes |
| Accuracy | exact strings | may paraphrase; must be told to copy verbatim |

Decision: **DOM first, LLM only on a miss.**
- `headline`: top card, the text block directly under the `h1` name.
- `current_company`: the top card's current-company button (aria-label / first company entry beside the headline area).
- `current_title`: headline segment before ` at ` / ` @ ` / `|` when it names that company. Otherwise the first Experience entry's title, **only if already rendered** (no extra navigation or clicks).
- `about`: the `#about` section's container text. The collapsed "see more" text is usually already in the DOM; read `innerText` of the full span and don't click.
- If `current_title` **or** `current_company` is missing, send `raw_text` (top card + About `innerText`, at most 4KB) and let the server extract via the gateway with a strict schema and "copy verbatim, null if absent."

Selectors live in one module with a golden test built from **synthetic** HTML fixtures (no real personal data in git).

The light extraction also captures the current company's LinkedIn company link and, when shown, its website link (top card / Experience entry, already rendered, no clicks). These feed §6b.

## 6b. Company briefs (public web, server-side)

Why: a vague or blank title ranks poorly even when the company is squarely relevant (an AI security startup, a seed fund). Company context fixes that for everyone, without touching LinkedIn.

Data: new table `company_briefs`, one row per (user, company_key):
- `company_key`: normalized domain when known, else normalized company name
- `name`, `domain`, `status` (`pending` | `done` | `no_site` | `failed`), `bullets` (json, 3-4 strings), `sources` (json, URLs actually read), `fetched_at`
- `linkedin_profiles` gains `company_key` (fk-ish, nullable)

Pipeline (FastAPI background task after each `/enrichment/results` batch, or `POST /enrichment/companies/run`):
1. Resolve the domain: website link captured from LinkedIn if present; otherwise a web search for "<company name>" plus the person's headline context, accepting the top result only if the company name appears on the page. Ambiguous or no match gives `no_site`, never a guess.
2. Fetch with Scrapling (httpx fallback): home page plus at most 2 of /about, /company, /careers, /jobs. Respect robots.txt, 10s timeout, one request per second per domain.
3. Extract 3-4 bullets through the metered gateway (`Task.COMPANY_BRIEF`, fast tier): what they build, who for, stage or size signals stated on the site, and whether a careers page lists open roles. Strict schema; every bullet must be supported by fetched text; no funding or headcount unless the page says it.
4. Store bullets and source URLs. Dead domains and parked pages give `failed` / `no_site`, shown as "No public company info".

Scale and cost: one brief per distinct company, reused across people and events (expect a few hundred for the current 663 profiles). A few thousand input tokens each on the fast tier, roughly a few dollars total (to confirm against `llm/` routing prices). Refresh when older than 60 days and the company has guests at an upcoming event.

Order: runs as light profiles land, so it never blocks the overnight worker and needs no laptop.

## 7. Re-ranking after enrichment

Embedding text (`matchmaking._person_text`) becomes, joined by ". " and skipping empties:
`name`, `current_title @ current_company`, `headline`, `about[:600]`, company brief bullets (§6b, when `done`), Luma `role`, `what_talked`.

The why-meet line may cite the company brief ("Northwind Labs is hiring security engineers, per its careers page") and must name its source (LinkedIn, company site, Luma bio) so the UI can show evidence strength.

Rules
- `hiring_title_boost` also reads `current_title` and `headline`. Remove the frontend second boost (`frontend/lib/hiringTitles.ts:19` `focusQueueScore`) so the boost counts once.
- `rank_event` must score **every** row (today 767 of 792 are unscored).
- The first run after enrichment overwrites the hand-set `needs_you`/`high` values unless the user wants manual overrides kept (see open questions). If kept, add `priority_source: ranker|manual` and let the ranker skip `manual` rows.
- `why_meet` stays capped at the top 12 per event. Its roster line uses the new display role instead of `'(no bio)'`.
- Rerank triggers at the end of each worker run and via `POST /enrichment/rerank`. Cost: one embed call per event (about 550 short texts) plus one fast completion.

## 8. Home Focus queue

Today: priority gate → social-proof gate → client sort → slice(40), after downloading all 553 guests. Change:
- Move selection server-side: `GET /events/{id}/focus-queue?limit=40` (overlaps the latency track; noted there).
- Candidates: undecided (`triage_state` null) **and** (`completeness` is `enriched` or `luma_only` with a non-empty role). Sort by `score`.
- **Pending lane:** guests with `completeness=pending` are not ranked yet. They are counted and listed as "Enrichment pending (N): runs tonight", with name, photo and LinkedIn link, and can be opened and kept manually. They are never silently dropped.
- `unavailable` guests: shown in the guest list with a "LinkedIn private" label and ranked on Luma text alone.
- `isFocusWorthyGuest` / `isTagPileRole` should judge the display role (enriched first), not only the Luma role.

## 9. Failure and degradation

| Situation | Behavior |
|---|---|
| Worker never runs | App behaves as today, plus explicit `pending` labels and the pending lane |
| Auth wall / checkpoint / CAPTCHA / 429 | Run stops, reason printed, checkpoint kept. Next night resumes after the user clears it in Edge |
| Render asleep / API down | Outbox holds results; flush retries with backoff (30s → 5min); scraping continues up to 200 unsent, then pauses |
| DOM changed | 3 consecutive extract errors stop the run; the LLM fallback covers partial misses |
| Profile private / gone | `unavailable` with reason; not retried |
| Transient failure | `failed`, attempts+1, retried next night, terminal at 3 |
| Stale data | `fetched_at` shown. Re-fetch only for guests of upcoming Events when older than 30 days (not in v1 scope unless asked) |

## 10. Runtime estimates (mean 60s per profile; breaks add about 10%)

| Scope | Profiles | Wall time | Nights at cap 300 |
|---|---|---|---|
| Blank-role only | 474 (minus overlap with the 22) | ~8.7h | 2 |
| Everyone with LinkedIn | 641 remaining | ~11.8h | 3 |
| One event: Build Fridays blank-role | ≤144 | ~2.6h | 1 |
| Smoke test | 3 | ~3 min | — |

A cap of 480 fits an 8h night, but 300 leaves margin and fewer long streaks.

## 11. Verification

- Backend pytest:
  - slug normalization table
  - upsert idempotency (same hash means unchanged)
  - attempts → terminal failed
  - queue ordering
  - worker-token auth rejects the normal JWT and vice versa
  - `raw_text` discarded after extraction
  - `_person_text` includes profile fields
  - rerank scores every row
- Worker unit tests: `classify()` and `extract()` against synthetic HTML fixtures (ok, not_found, restricted, authwall, checkpoint); pacing bounds; resume from checkpoint + outbox.
- Live smoke: `--limit 3 --dry-run`, then `--limit 3` against prod. Confirm `GET /events/{id}/guests` shows `profile.status=done` and `fetched_at`.
- Outcome check (the real one): before and after one night, count blank-role guests eligible for Focus, and confirm at least one formerly blank-role person with a relevant title reaches the top 12 for the AI Security Hackathon.

## 12. Doc / ADR follow-ups

- **Amend ADR-0005:** light LinkedIn fields (headline, title, company, About) are fetched for every guest with a LinkedIn URL, before Keep, via the user's own browser overnight. Company briefs from public company websites are built for every current company, server-side. Deep research (posts, comments, activity, X) stays after Keep.
- Reconcile ticket 05 (`.scratch/compounding-networking-agent/issues/05-enrichment-agents.md`): Scrapling and in-process server fetching are replaced by a laptop worker plus ingest API. `profile` JSON is replaced by `linkedin_profiles`.
- Update "no LinkedIn/X scrape" statements: `backend/README.md:9`, `people.py:1`, `models.py:136`, `people_fixtures.py:3`, `signals.py:3`.
- CONTEXT.md: add the terms **Profile** (light, per slug) and **Completeness**.
- Risk note for README: automated LinkedIn viewing is against LinkedIn's User Agreement. The user accepts the account risk; the worker stops on any challenge.

## 13. Open questions for the user

1. **Nightly cap and window:** 300 profiles and a stop at 07:00, or run until the queue is empty?
2. **Manual priorities:** Build Fridays' 31 hand-set `needs_you` rows. Should the ranker overwrite them, or keep them as manual overrides?
3. **About length:** is a 2,000-character cap fine, or keep the full text?
4. **Refresh:** fetch once and never refresh, or re-fetch guests of upcoming Events when older than 30 days?
5. **Browser:** keep Edge on :9222 (as before), or use Chrome?
6. **X:** the big events have 0 X URLs. OK to drop X entirely from this track?
7. **Rerank trigger:** automatic at the end of each night, or only when you click or ask?
8. **Deep research scope:** only people you Keep, or also the top N (say 10) per upcoming event before you go?
9. **Company domain lookup:** OK to use a web search when LinkedIn shows no website link, or only use links LinkedIn provides (fewer briefs, zero guessing)?
