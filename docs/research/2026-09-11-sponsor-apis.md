# Sponsor APIs: Orbit integration research (2026-09-11)

Source brief: *Data and AI Hackathon: From Memory to Muscle Memory* (organizer PDF, 8 pp.).
Every claim below links to a primary source (vendor docs, vendor GitHub source/README, vendor pricing page).
`UNVERIFIED` means no primary source confirmed it. Checked 2026-09-11. Dev box: Windows 11, Git Bash + PowerShell 7, Python 3.12.10, Node 22, Docker Desktop running, WSL2 distro `Ubuntu-24.04` present (stopped), no `cargo`/`scoop`/`snyk` installed.

---

## Summary

| Tool | Layer (guide) | Access | SDK / CLI | Windows OK? | Solo integration | Verified? |
|---|---|---|---|---|---|---|
| **Cognee** | Structure | OSS local (no account), Docker, or Cognee Cloud (`platform.cognee.ai`) | `pip install cognee` (1.5.4, py 3.10-3.14), REST `/api/v1/*`, MCP | **Yes.** Native wheels for its embedded DBs on win_amd64 | 1.5-2.5 h | Yes (Nebius config per docs; JSON mode on Nebius models UNVERIFIED) |
| **HydraDB** | Memory | **Two different products:** (a) OSS Cypher graph DB (Docker, self-host); (b) HydraDB Cloud memory API (free "Ship" tier) | (a) `pip install neo4j` over Bolt, or HTTP; (b) `pip install "hydradb-sdk>=2,<3"` | (a) Docker yes, native build no; (b) yes (pure Python) | (b) ~1 h; (a) +1.5 h | Yes. **The two surfaces conflict, see risks** |
| **hotdata.dev** | Insight | Cloud (`app.hotdata.dev`, $100 signup credit) | `pip install hotdata` (0.10.0), REST, CLI (Rust) | SDK/REST yes. **CLI: no Windows binary** (use WSL or skip it) | 1-1.5 h | Yes |
| **RocketRide** | Motion | Cloud (hackathon: `staging.rocketride.ai` + coupon) or self-host engine | `pip install rocketride` (1.3.0), CLI, VS Code ext, MCP | **Yes.** `win64.zip` engine and VS Code extension | 2-3 h | Mostly. The staging SDK URI is UNVERIFIED |
| **Modiqo Rote** | Muscle memory | Free Community plan, Google/GitHub sign-in | `rote` CLI + "Play" harness skill. No SDK | **WSL2 only.** Native Windows is rejected by the installer | 1.5-2.5 h (+30 min WSL setup) | Yes |
| **Snyk** | Security (scored) | Free plan | CLI (`npm i -g snyk` / scoop / exe), MCP built into CLI | Yes. **Not** in WSL | 30-60 min + fix time | Yes |

---

## Setup order (slow and approval-gated first)

1. **Start the slow downloads in the background** (5 min of your attention, then they run on their own):
   - `docker pull ghcr.io/hydra-db/hydradb:latest` (only if you take the Cypher path, see HydraDB) ([README](https://github.com/hydra-db/hydradb#getting-started))
   - Boot WSL and install Rote (step 2). The installer needs Python ≥3.10 + `uv` inside WSL ([modiqo/play](https://github.com/modiqo/play)).
2. **Rote (the guide asks for this *before* arrival; it needs account + install + a hello run).** Details are in the Rote section. The WSL install and OAuth are the slowest part.
3. **RocketRide staging account + coupon + API key.** The coupon is only handed out at the event, so grab it at check-in ([guide §5](#rocketride)).
4. **HydraDB Cloud:** sign up, create an API key, then `databases.create`. Provisioning is **async** (you poll `ready_for_ingestion`), so kick it off early ([quickstart](https://docs.hydradb.com/get-started/v2/quickstart.md)).
5. **hotdata:** sign up at `app.hotdata.dev` and issue an API token from the dashboard (it is shown once) ([core concepts](https://www.hotdata.dev/docs/core-concepts)). Note the workspace id.
6. **Cognee:** no account needed for local. Only use Cognee Cloud if you want hosted; sign-ups can land on a waitlist ("We're at capacity") ([sign-up](https://docs.cognee.ai/cognee-cloud/sign-up.md)).
7. **Snyk:** sign up, `snyk auth`, enable **Snyk Code** in org settings (off until an Org Admin enables it), configure MCP, run the first scan ([configure Snyk Code](https://docs.snyk.io/scan-fix-and-prevent/scan-with-snyk/snyk-code/configure-snyk-code.md)).

### Env vars (put in `backend/.env`, never commit)
```
NEBIUS_API_KEY=...
# RocketRide
ROCKETRIDE_URI=https://api.rocketride.ai        # staging value: see RocketRide gotchas
ROCKETRIDE_APIKEY=...                           # ROCKETRIDE_AUTH also accepted
ROCKETRIDE_NEBIUS_KEY=${NEBIUS_API_KEY}         # auto-substituted into Nebius LLM nodes
# HydraDB Cloud
HYDRA_DB_API_KEY=...
# HydraDB OSS (Cypher path)
HYDRA_BOLT_URI=neo4j://127.0.0.1:7687
HYDRA_TOKEN=local-development-token-32-bytes
# hotdata
HOTDATA_API_KEY=...
HOTDATA_WORKSPACE=...
# Cognee (read from .env in the process's CWD at import time)
LLM_PROVIDER=custom
LLM_MODEL=openai/meta-llama/Llama-3.3-70B-Instruct
LLM_ENDPOINT=https://api.tokenfactory.nebius.com/v1
LLM_API_KEY=${NEBIUS_API_KEY}
EMBEDDING_PROVIDER=openai_compatible
EMBEDDING_MODEL=BAAI/bge-en-icl
EMBEDDING_ENDPOINT=https://api.tokenfactory.nebius.com/v1
EMBEDDING_API_KEY=${NEBIUS_API_KEY}
EMBEDDING_DIMENSIONS=<len of one embedding: measure it, see Cognee gotchas>
COGNEE_API_KEY=...                              # Cloud only
# Snyk (CI only; local uses `snyk auth`)
SNYK_TOKEN=...
```
Env var names come from: RocketRide [cloud](https://docs.rocketride.org/cloud.md) and [Nebius preset](https://docs.rocketride.org/nodes/llm_openai_api.md); HydraDB [quickstart](https://docs.hydradb.com/get-started/v2/quickstart.md); hotdata [CLI README](https://github.com/hotdata-dev/hotdata-cli) and [RocketRide node](https://docs.rocketride.org/nodes/db_hotdata.md); Cognee [LLM](https://docs.cognee.ai/setup-configuration/llm-providers) and [embedding](https://docs.cognee.ai/setup-configuration/embedding-providers) providers; Snyk [auth](https://docs.snyk.io/developer-tools/snyk-cli/authenticate-to-use-the-cli.md). Note: `.env` files do not expand `${...}`, so the setup script must write literal values.

---

## Critical path & risks

**Top blockers**
1. **"HydraDB" means two incompatible things.** The guide describes OpenCypher, snapshot-consistent, object-store-native storage. That is the **OSS repo** [hydra-db/hydradb](https://github.com/hydra-db/hydradb) (AGPL-3.0, self-host, Bolt + HTTP). **HydraDB Cloud** (`hydradb.com`, `hydradb-sdk`) is a memory/context API. Its own blog says it "does not expose Cypher" ([hydradb.com/blog/neo4j-alternatives](https://hydradb.com/blog/neo4j-alternatives)), and RocketRide's native HydraDB node targets that Cloud API: "HydraDB has no Cypher/AQL equivalent" ([node doc](https://docs.rocketride.org/nodes/graph_hydradb.md)). **Decision needed:** (a) Cloud only: fastest, native RocketRide node, but no Cypher; (b) OSS only: Cypher multi-hop, but Docker-local, so a cloud RocketRide engine cannot reach it; (c) both: Cloud as agent memory plus OSS for Cypher traversals (most "load-bearing", +1.5 h). Recommendation: **(a) first, add (b) if on schedule.** Ask a HydraDB mentor at the event which one judges expect.
2. **Rote does not run on native Windows.** The installer exits on `MINGW*|MSYS*|CYGWIN*|Windows_NT*` with "native Windows is not supported yet; run Play from WSL2, Linux, or macOS" ([play install.sh v0.4.98](https://raw.githubusercontent.com/modiqo/play/v0.4.98/install.sh)). The Playoffs page advertises "Windows via WSL" ([the-playoffs](https://www.modiqo.ai/blog/the-playoffs)). From WSL, reaching Orbit on Windows `localhost:8001` needs `networkingMode=mirrored` in `.wslconfig` (Win11 22H2+) or the host IP ([MS Learn](https://learn.microsoft.com/en-us/windows/wsl/networking)).
3. **A RocketRide cloud engine cannot reach `localhost`.** The HTTP Request, Cognee, and HydraDB-OSS calls all originate from the engine. Either run the engine locally (VS Code extension "Local" or `engine.exe`, [self-hosting](https://docs.rocketride.org/self-hosting.md)) or point the tools at public URLs (Orbit already has a Render service `orbit-api`).
4. **Dependency conflict: Cognee vs Orbit's pinned backend.** `cognee 1.5.4` requires `fastapi>=0.116.2`, `sqlalchemy>=2.0.39`, `alembic>=1.13.3`, and `websockets>=15.0.1` ([PyPI metadata](https://pypi.org/pypi/cognee/1.5.4/json)). `backend/requirements.txt` pins `fastapi==0.115.0`, `sqlalchemy==2.0.35`, `alembic==1.13.2`, and `websockets==13.1`. Either bump those pins (older pins also tend to show up in Snyk results) or run Cognee as a separate process/Docker container and call its REST API.

**Unverified claims**
- The RocketRide `ROCKETRIDE_URI` for **staging** keys. Docs list `https://api.rocketride.ai` ([cloud](https://docs.rocketride.org/cloud.md)); the Python page shows `https://cloud.rocketride.ai`/`wss://cloud.rocketride.ai` ([python](https://docs.rocketride.org/develop/python.md)). The staging web bundle connects to its own origin (`serverUri = uri || window.location.origin`), which suggests `https://staging.rocketride.ai`. That is my inference, not documented: try it first and fall back to `api.rocketride.ai`.
- The organizer PDF's hidden "Guide" and YouTube links for RocketRide: not recoverable from the PDF text or the vendor sites.
- Whether Nebius chat models honor Cognee's structured-output `json_mode` (custom endpoints default to `json_mode` under instructor, [LLM providers](https://docs.cognee.ai/setup-configuration/llm-providers)).
- Nebius `BAAI/bge-en-icl` embedding dimension. Measure it with one call before setting `EMBEDDING_DIMENSIONS`; a mismatch is fatal ([embedding providers](https://docs.cognee.ai/setup-configuration/embedding-providers)).
- Whether HydraDB's Docker image runs on Docker Desktop for Windows with a Windows bind mount without `--user` (the README's `--user "$(id -u):$(id -g)"` is Linux-specific).
- A Windows build of `hotdata-cli` from source (`cargo install`). There is no Windows release asset ([v0.33.0 assets](https://github.com/hotdata-dev/hotdata-cli/releases/tag/v0.33.0)).
- Whether a Rote Play installed in WSL is visible to Claude Code running on Windows. The installer writes skills into the detected harness's home (e.g. `~/.claude/skills/play`) inside WSL ([modiqo/play](https://github.com/modiqo/play)). You can always call the `rote` CLI directly.
- Rote-exposed token metrics. Docs cite "first frontier run spent 14,900 reasoning tokens ... every Play run after spent about 300" ([product.md](https://www.modiqo.ai/agent/product.md)), but the run report only documents **per-step ms timings and completion counts** ([run your first play](https://www.modiqo.ai/docs/01-run-your-first-play.md)). Orbit must measure LLM calls and tokens itself.

**Recommended integration order** (each step is demoable on its own):
Snyk scan baseline (15 min) → hotdata guest table + BM25/vector rank (Insight) → Cognee remember/recall on bios + Focus (Structure) → HydraDB write-back of graph and outcomes (Memory) → RocketRide Inbox pipeline (Motion) → Rote capture/replay + run#1 vs run#2 panel (Muscle memory) → Snyk rescan and fix.

**ScrapeGraphAI:** not mentioned in the guide or in any sponsor doc reviewed here. Skipped.

---

## Cognee

**1. What it is.** Open-source memory for agents: `remember()` "runs add + cognify + improve", turning data into a knowledge graph plus embeddings, and `recall()` queries it with auto-routing ([README](https://github.com/topoteretes/cognee), [remember](https://docs.cognee.ai/core-concepts/main-operations/remember.md)).

**2. Setup (Windows)**
1. Separate venv, because of the dependency conflict in the risks section ([install](https://docs.cognee.ai/getting-started/installation)):
   ```powershell
   python -m venv .venv-cognee; .\.venv-cognee\Scripts\Activate.ps1
   pip install cognee            # 1.5.4, requires Python 3.10-3.14
   ```
2. `.env` in the working directory, loaded at import. Use the Nebius block from Env vars above. Windows paths in `.env` need `/` or `\\` ([install](https://docs.cognee.ai/getting-started/installation)).
3. Cloud only: sign up at <https://platform.cognee.ai>, go to **API Keys**, click **Create new key** (shown once), and store it as `COGNEE_API_KEY`. The per-tenant base URL is on the API Keys page, and auth is the `X-Api-Key` header ([sign-up](https://docs.cognee.ai/cognee-cloud/sign-up.md), [API intro](https://docs.cognee.ai/api-reference/introduction.md)). Pricing: $1.00 per 1M tokens, free start ([billing](https://docs.cognee.ai/cognee-cloud/functionality/account-and-billing.md)).
4. Docker server alternative: `docker run --env-file ./.env -p 8000:8000 --rm -it cognee/cognee:main` ([API intro](https://docs.cognee.ai/api-reference/introduction.md)).
5. **Smoke test** (pattern from [recall](https://docs.cognee.ai/core-concepts/main-operations/recall.md)): save as `smoke_cognee.py` and run it with the venv's python:
   ```python
   import asyncio, cognee
   async def main():
       await cognee.remember("Einstein was born in Ulm.")
       print(await cognee.recall("Where was Einstein born?"))
   asyncio.run(main())
   ```

**3. Surface.** Python SDK (`remember`, `recall`, `improve`, `forget`, plus legacy `add`/`cognify`/`search`) ([python-api](https://docs.cognee.ai/python-api)); REST `POST /api/v1/remember`, `POST /api/v1/recall` ([remember REST](https://docs.cognee.ai/api-reference/remember/remember.md), [recall REST](https://docs.cognee.ai/api-reference/recall/recall.md)); MCP server ([mcp](https://docs.cognee.ai/cognee-mcp/mcp-overview.md)); a **native RocketRide `tool_cognee` node** exposing `cognee.remember`/`cognee.recall`/`cognee.memory_status` to agents ([node](https://docs.rocketride.org/nodes/tool_cognee.md)). Graph stores: `kuzu` (default), `neo4j`, `neo4j_aura`, `neptune`, `postgres_demo`, `memgraph` (community) ([graph stores](https://docs.cognee.ai/setup-configuration/graph-stores.md)).

**Specific answers**
- **Nebius (OpenAI-compatible)?** Yes. Set `LLM_PROVIDER="custom"`, `LLM_MODEL="openai/<model-id>"`, `LLM_ENDPOINT=".../v1"`; `custom` is required or you get `ProviderNotDeducibleError` ([LLM providers](https://docs.cognee.ai/setup-configuration/llm-providers)). Embeddings: `EMBEDDING_PROVIDER="openai_compatible"` takes bare model ids and normalizes `/v1` ([embedding providers](https://docs.cognee.ai/setup-configuration/embedding-providers)). Nebius serves `/v1/embeddings` with `BAAI/bge-en-icl` ([Nebius docs](https://docs.tokenfactory.nebius.com/api-reference/examples/create-embeddings)).
- **Can HydraDB be Cognee's graph store directly?** No, not practically. There is no HydraDB adapter. The `neo4j` provider requires APOC ([graph stores](https://docs.cognee.ai/setup-configuration/graph-stores.md)), and HydraDB implements a narrow Cypher subset with **integer-only node ids**, no `IN`/`CONTAINS`/`IS NULL`, and no `ON CREATE` ([cypher-compat.md](https://github.com/hydra-db/hydradb/blob/main/cypher-compat.md)). A custom adapter is possible via `use_graph_adapter(name, adapter)` ([source](https://github.com/topoteretes/cognee/blob/main/cognee/infrastructure/databases/graph/use_graph_adapter.py)), but it means implementing the whole `GraphDBInterface`, which is too much for 8 h. **Write Cognee's output into HydraDB yourself:** call `get_graph_engine().get_graph_data()`, which returns `(nodes, edges)` ([interface source](https://github.com/topoteretes/cognee/blob/main/cognee/infrastructure/databases/graph/graph_db_interface.py)), then batch `UNWIND ... MERGE` into HydraDB OSS, or send the text to HydraDB Cloud `context.ingest`.
- **remember/recall exposure:** `await cognee.remember(data, dataset_name=..., session_id=..., graph_model=..., custom_prompt=..., self_improvement=..., run_in_background=...)` returns a `RememberResult` (`status`, `dataset_id`, `elapsed_seconds`, ...). Passing `session_id` writes to the fast session cache and bridges to the graph in the background ([remember](https://docs.cognee.ai/core-concepts/main-operations/remember.md), [source](https://github.com/topoteretes/cognee/blob/main/cognee/api/v1/remember/remember.py)). `await cognee.recall(query_text, query_type=..., datasets=..., top_k=..., session_id=..., only_context=..., response_model=...)` returns `ResponseGraphEntry` / `ResponseQAEntry` items; `query_type` includes `GRAPH_COMPLETION`, `CHUNKS`, `CYPHER`, `TEMPORAL`, ... ([recall](https://docs.cognee.ai/core-concepts/main-operations/recall.md)).
- **Custom DataPoint / ontology:** yes. Subclass `cognee.low_level.DataPoint` and pass `graph_model=` plus `custom_prompt=` ([custom graph model](https://docs.cognee.ai/guides/custom-graph-model.md)). OWL/RDF ontologies are supported ([ontology guide](https://docs.cognee.ai/guides/ontology-support.md)); REST takes `ontology_key` ([remember REST](https://docs.cognee.ai/api-reference/remember/remember.md)).

**4. Example** (shaped from the [custom graph model guide](https://docs.cognee.ai/guides/custom-graph-model.md)):
```python
import asyncio
import cognee
from cognee.low_level import DataPoint

class Skill(DataPoint):
    name: str
    metadata: dict = {"index_fields": ["name"], "identity_fields": ["name"]}

class Company(DataPoint):
    name: str
    metadata: dict = {"index_fields": ["name"], "identity_fields": ["name"]}

class Struggle(DataPoint):          # the Focus "Struggle"
    name: str
    metadata: dict = {"index_fields": ["name"], "identity_fields": ["name"]}

class Attendee(DataPoint):
    name: str
    role: str | None = None
    works_at: Company | None = None
    has_skill: list[Skill] | None = None
    can_help_with: list[Struggle] | None = None
    metadata: dict = {"index_fields": ["name"], "identity_fields": ["name"]}

class EventGraph(DataPoint):
    attendees: list[Attendee]

PROMPT = ("Extract every attendee, their role, company, skills, and which founder "
          "struggles (fundraising, hiring, GTM, infra) they could help with.")

async def main(event_id: str, bios_text: str, user_id: str):
    await cognee.remember(bios_text, dataset_name=f"event_{event_id}",
                          graph_model=EventGraph, custom_prompt=PROMPT,
                          self_improvement=False)
    hits = await cognee.recall("Who can help a seed-stage founder with hiring ML engineers?",
                               datasets=[f"event_{event_id}"], top_k=10)
    # outcome memory (keep/skip/reply) as a fast session write
    await cognee.remember("User KEPT Jane Doe for Focus 'Founder / hiring'",
                          session_id=f"user_{user_id}")
    return hits
```

**5. Gotchas.** The default local stores are embedded (the Kuzu successor `ladybug==0.19.0`, `lancedb`, sqlite), and all ship `win_amd64` wheels for cp312 ([ladybug](https://pypi.org/pypi/ladybug/0.19.0/json), [lancedb](https://pypi.org/pypi/lancedb/json)). On Windows it pulls `python-magic-bin` ([metadata](https://pypi.org/pypi/cognee/1.5.4/json)). Set **both** LLM and embedding providers, or you get `ProviderConfigMismatchError` ([embeddings](https://docs.cognee.ai/setup-configuration/embedding-providers)). `recall` is eventually consistent after background processing; wait for completion before recalling ([RocketRide node notes](https://docs.rocketride.org/nodes/tool_cognee.md)). Cognify costs one LLM call per chunk, so for latency batch a whole event's bios in one `remember`.

**6. Load-bearing and repeated.** Run `remember` on every Event sync (new guest bios) and on every keep/skip/reply (session memory → `improve` bridges it into the graph). Run `recall` on every ranking request ("who helps with *this* Struggle"). Export the graph to HydraDB after each cognify. **~1.5-2.5 h.**

---

## HydraDB

**1. What it is.** OSS: "an object-store-native distributed graph database written in Rust ... snapshot-consistent OpenCypher queries, GraphBLAS traversal, Neo4j-compatible Bolt connectivity, and an HTTPS query API" ([README](https://github.com/hydra-db/hydradb)). Cloud: a "unified context substrate for AI" that manages memories and knowledge with graph-enriched retrieval ([docs](https://docs.hydradb.com/)).

**2a. Setup: HydraDB Cloud (Windows OK)**
1. Sign up at <https://app.hydradb.com/sign-up> (redirects to `dashboard.hydradb.com`) and create an API key in the dashboard ([docs](https://docs.hydradb.com/), [RocketRide node setup](https://docs.rocketride.org/nodes/graph_hydradb.md)). The free "Ship" tier has unlimited API calls ([hydradb.com](https://hydradb.com/)).
2. `pip install "hydradb-sdk>=2,<3"` (2.1.4, depends only on `httpx`/`pydantic`) and set `$env:HYDRA_DB_API_KEY`. Base URL: `https://api.hydradb.com` ([quickstart](https://docs.hydradb.com/get-started/v2/quickstart.md)).
3. **Smoke test:** the quickstart script below (create db → poll → ingest → poll → query).

**2b. Setup: OSS Cypher node via Docker (Windows adaptation of the [README](https://github.com/hydra-db/hydradb#getting-started))**
```powershell
New-Item -ItemType Directory -Force hydradb-data\store, hydradb-data\cache | Out-Null
[IO.File]::WriteAllText("$PWD\hydradb-data\auth-token", "local-development-token-32-bytes`n")  # LF, not CRLF
docker run --rm -p 7687:7687 -p 8443:8443 -p 9090:9090 `
  -v "${PWD}\hydradb-data:/data" `
  -e CLOUD_PROVIDER=local -e LOCAL_PATH=/data/store -e GRAPH_NAMESPACE=default `
  -e GRAPH_ID=default -e GRAPH_CELL_ID=cell-0 -e GRAPH_CELLS=cell-0 -e GRAPH_NODE_ID=node-0 `
  -e GRAPH_BOLT_NODE_ADDRESSES=node-0=127.0.0.1:7687 -e GRAPH_ADVERTISED_BOLT_ADDR=127.0.0.1:7687 `
  -e GRAPH_DATA_CACHE_DIR=/data/cache -e GRAPH_AUTH_TOKEN_FILE=/data/auth-token `
  -e GRAPH_ALLOW_PLAINTEXT=true -e RUST_MIN_STACK=33554432 `
  ghcr.io/hydra-db/hydradb:latest
```
- The README adds `--user "$(id -u):$(id -g)"` because the image runs as UID 10001. That is Linux-only. On Docker Desktop for Windows it is UNVERIFIED whether you need it; if the container fails on its first storage write, add `--user 0:0`. In Git Bash, prefix with `MSYS_NO_PATHCONV=1` so `/data/...` args are not rewritten.
- Readiness: `curl.exe http://127.0.0.1:9090/readyz`. **Smoke test:** a round-trip write, because "a listening port is not proof" ([README](https://github.com/hydra-db/hydradb#verify-a-running-node)):
  ```powershell
  $h=@{Authorization="Bearer local-development-token-32-bytes";"X-Graph-Namespace"="default"}
  Invoke-RestMethod -Method Post http://127.0.0.1:8443/v1/graphs/default/query -Headers $h -ContentType application/json -Body '{"cell_id":"cell-0","query":"CREATE (a {id: 1})-[:FOLLOWS]->(b {id: 2})"}'
  Invoke-RestMethod -Method Post http://127.0.0.1:8443/v1/graphs/default/query -Headers $h -ContentType application/json -Body '{"cell_id":"cell-0","query":"MATCH (a {id: 1})-[:FOLLOWS]->(b) RETURN b.id AS id"}'
  ```
- Source builds need Rust 1.91+, `libcypher-parser`, and SuiteSparse on **Ubuntu/WSL/macOS only**. Use Docker.

**3. Surface.** OSS: Bolt 5.x via any Neo4j driver (`neo4j://` routed; `bolt://` is for diagnostics); HTTP `POST /v1/graphs/{graph}/query`; admin `/readyz` and `/metrics`; AGPL-3.0; no managed Cypher service found ([README](https://github.com/hydra-db/hydradb)). Cloud: Python `hydradb-sdk`, TS `@hydradb/sdk@^2`, REST, OpenAPI at `docs.hydradb.com/api-reference/v2/openapi.json` ([llms.txt](https://docs.hydradb.com/llms.txt)); a native RocketRide `graph_hydradb` node with `store_memory` / `recall_memory` / `query_graph` / `get_schema` ([node](https://docs.rocketride.org/nodes/graph_hydradb.md)).

**4. Examples**

Cloud (verbatim shape from the [quickstart](https://docs.hydradb.com/get-started/v2/quickstart.md)):
```python
import json, os, time
from hydra_db import HydraDB
client = HydraDB(token=os.environ["HYDRA_DB_API_KEY"])
db = "orbit"
client.databases.create(database=db)
while not client.databases.status(database=db).data.infra.ready_for_ingestion:
    time.sleep(5)
ing = client.context.ingest(type="memory", database=db, memories=json.dumps([
    {"text": "User KEPT Jane Doe (Head of ML, Acme) for Focus Founder/hiring; she replied to intro email v2."}]))
mid = ing.data.results[0].id
while (s := client.context.status(database=db, ids=[mid]).data.statuses[0]).indexing_status != "completed":
    if s.indexing_status == "errored": raise RuntimeError(s.error_message)
    time.sleep(2)
res = client.query(database=db, type="memory", query="Which outreach got replies from ML leaders?")
print(res.data.chunks)   # graph_context defaults to true -> multi-hop query_paths
```
Graph traversal in Cloud comes back as `graph_context` triplets / `query_paths`, not Cypher ([context graphs](https://docs.hydradb.com/essentials/v2/context-graphs)).

OSS Cypher (driver usage from the repo's [runtime_smoke.sh](https://github.com/hydra-db/hydradb/blob/main/scripts/runtime_smoke.sh); syntax from [cypher-compat.md](https://github.com/hydra-db/hydradb/blob/main/cypher-compat.md)):
```python
import os, uuid
from neo4j import GraphDatabase

def hid(u: str) -> int:              # HydraDB node ids must be non-negative integers
    return uuid.UUID(u).int >> 65    # 63-bit stable id derived from the Cognee UUID

drv = GraphDatabase.driver(os.environ["HYDRA_BOLT_URI"], auth=("neo4j", os.environ["HYDRA_TOKEN"]))
with drv.session(database="default") as s:
    s.run("UNWIND $rows AS row MERGE (n {id: row.id}) SET n:Attendee, n.name = row.name, n.cognee_id = row.cid",
          rows=[{"id": hid(c), "cid": c, "name": n} for c, n in attendees]).consume()
    s.run("UNWIND $rows AS row MATCH (a:Attendee {id: row.src}), (k:Skill {id: row.dst}) "
          "MERGE (a)-[r:HAS_SKILL {id: row.rid}]->(k) SET r.weight = row.w RETURN count(*)",  # UNWIND MATCH must end in RETURN or DELETE
          rows=edge_rows).consume()
    # multi-hop: skills of people at companies the user already got replies from
    q = ("MATCH (u:User {id: $uid})-[:GOT_REPLY]->(a:Attendee)-[:WORKS_AT]->(c:Company)"
         "<-[:WORKS_AT]-(b:Attendee) RETURN b.name AS name, count(*) AS paths ORDER BY paths DESC LIMIT 20")
    print(list(s.run(q, uid=1)))
```
The UNWIND batch forms are narrow: `MERGE` by id, then `SET`; one relationship type per batch; the list must be a parameter. The `RETURN count(*)` ending on the second statement is my reading of that rule, so test it first ([cypher-compat.md](https://github.com/hydra-db/hydradb/blob/main/cypher-compat.md)).

**5. Gotchas.** OSS: ids are ints only; no `IN`/`CONTAINS`/`ENDS WITH`/`IS NULL`/`min`/`max`; bounded var-length paths only (`*1..3`); one statement per request; labels cannot be parameters, so format them from a whitelist; `RUST_MIN_STACK` is required or the node aborts on its first query; `consistency: "strong"` costs an object-store refresh ([README](https://github.com/hydra-db/hydradb), [cypher-compat.md](https://github.com/hydra-db/hydradb/blob/main/cypher-compat.md)). Cloud: provisioning and indexing are async (poll); no published rate limits (UNVERIFIED); `recall_memory` in RocketRide caps results at 100 ([node](https://docs.rocketride.org/nodes/graph_hydradb.md)).

**6. Load-bearing and repeated.** On every Cognee cognify, upsert Attendee/Company/Skill/Role/Struggle into HydraDB. On every keep/skip/reply/stamp, write an outcome edge (`KEPT`, `SKIPPED`, `GOT_REPLY`). The RocketRide pipeline reads HydraDB first ("have we contacted anyone at this company? what worked?") before drafting. Show a "what changed since last session" query on `/home`. **Cloud ~1 h; OSS Cypher +1.5 h.**

---

## hotdata.dev

**1. What it is.** "The ultra high concurrency execution layer for AI agents" ([hotdata.dev](https://www.hotdata.dev/)): isolated workspaces and instant (TTL) databases for SQL, BM25, vector, and geo queries. The engine is DataFusion behind a Postgres parser ([RocketRide node doc](https://docs.rocketride.org/nodes/db_hotdata.md), [SQL ref](https://www.hotdata.dev/docs/sql)).

**2. Setup (Windows)**
1. Sign up at <https://app.hotdata.dev> ($100 signup credit covers the $5 base fee, 10 GB, and 1 TB of reads, [pricing](https://www.hotdata.dev/pricing)).
2. Issue an **API token from the dashboard** (shown once; read or read-write; can be scoped to a workspace) ([core concepts](https://www.hotdata.dev/docs/core-concepts)). Note the **workspace id** (the `X-Workspace-Id` header).
3. `pip install hotdata` (0.10.0; `hotdata[arrow]` for Arrow) ([Python SDK](https://www.hotdata.dev/docs/python-sdk), [PyPI](https://pypi.org/pypi/hotdata/json)).
4. **CLI on Windows:** `brew` is macOS-only, and releases ship only macOS/Linux `.tar.xz` plus a shell installer ([v0.33.0 assets](https://github.com/hotdata-dev/hotdata-cli/releases/tag/v0.33.0), [CLI reference](https://www.hotdata.dev/docs/cli-reference)). Options: (a) **skip the CLI**; the SDK/REST covers everything Orbit needs (recommended); (b) inside WSL: `curl -fsSL https://github.com/hotdata-dev/hotdata-cli/releases/latest/download/hotdata-cli-installer.sh | sh`, then `hotdata auth login`; (c) `cargo install` from source (UNVERIFIED on Windows, and no cargo on this box). The guide's "connect at least one data source" works through the SDK/REST too.
5. **Smoke test:** `curl.exe -X POST https://api.hotdata.dev/v1/query -H "Authorization: Bearer $env:HOTDATA_API_KEY" -H "X-Workspace-Id: $env:HOTDATA_WORKSPACE" -H "Content-Type: application/json" -d '{\"sql\":\"SELECT 1\"}'` (headers and path from the [API reference](https://www.hotdata.dev/docs/api-reference)).

**3. Surface.** Python SDK `hotdata` (generated OpenAPI client) ([sdk-python](https://github.com/hotdata-dev/sdk-python)); REST `https://api.hotdata.dev/v1/*`, OpenAPI at <https://www.hotdata.dev/openapi.yaml>; Rust CLI; Rust SDK, LangChain, dlt, dbt, and Ibis integrations ([docs](https://www.hotdata.dev/docs)); a **native RocketRide `db_hotdata` node** (NL→SQL, `load_data`, `execute`, `build_index`) ([node](https://docs.rocketride.org/nodes/db_hotdata.md)). Cloud only. External sources: 168 types in 8 families, including `sql` (postgres: host/port/database or `connection_string`) ([pull data](https://www.hotdata.dev/docs/pull-data)). Your Postgres is on localhost:5434 and **not reachable from hotdata cloud**, so push the guest rows instead.

**4. Example** (calls from [Python SDK doc](https://www.hotdata.dev/docs/python-sdk) and generated docs for [DatabasesApi](https://github.com/hotdata-dev/sdk-python/blob/main/docs/DatabasesApi.md), [IndexesApi](https://github.com/hotdata-dev/sdk-python/blob/main/docs/IndexesApi.md), [LoadManagedTableRequest](https://github.com/hotdata-dev/sdk-python/blob/main/docs/LoadManagedTableRequest.md), [CreateIndexRequest](https://github.com/hotdata-dev/sdk-python/blob/main/docs/CreateIndexRequest.md)):
```python
import os, hotdata
cfg = hotdata.Configuration(api_key=os.environ["HOTDATA_API_KEY"],
                            workspace_id=os.environ["HOTDATA_WORKSPACE"])
with hotdata.ApiClient(cfg) as c:
    dbs = hotdata.DatabasesApi(c)
    db = dbs.create_database(hotdata.CreateDatabaseRequest(
        name=f"orbit_event_{event_id}", expires_at="24h",
        schemas=[hotdata.DatabaseDefaultSchemaDecl(name="public", tables=[
            hotdata.DatabaseDefaultTableDecl(name="guests"),
            hotdata.DatabaseDefaultTableDecl(name="guests_vec")])]))
    csv = "attendee_id,name,role,company,bio\n..."           # inline CSV <= 2 MiB
    for t in ("guests", "guests_vec"):                          # one auto-embed vector index must be alone on its table
        dbs.load_database_table(db.id, "public", t,
            hotdata.LoadManagedTableRequest(mode="replace", data=csv))
    idx = hotdata.IndexesApi(c)
    idx.create_index(db.default_connection_id, "public", "guests",
        hotdata.CreateIndexRequest(index_name="guests_bio_bm25", columns=["bio"], index_type="bm25"))
    # vector: first register a provider via EmbeddingProvidersApi (provider_type="service",
    # config={"model": "BAAI/bge-en-icl", "base_url": "https://api.tokenfactory.nebius.com/v1"}, api_key=NEBIUS)
    # then CreateIndexRequest(index_type="vector", columns=["bio"], embedding_provider_id=prov.id)
    q = hotdata.QueryApi(c).query(hotdata.QueryRequest(sql=
        "SELECT attendee_id, name, role, score FROM bm25_search('default.public.guests','bio',"
        "'hiring ML engineers seed fundraising', 25) ORDER BY score DESC"), x_database_id=db.id)
    print(q.columns, q.rows)
```
Search SQL: `bm25_search(table, column, query, k)` returns base columns plus `score`; vector search uses `vector_distance(col, 'text')`, `vector_search(...)`, and `cosine_distance(col, ARRAY[...])`; geo uses `ST_*` including `ST_DistanceSphere` ([SQL ref](https://www.hotdata.dev/docs/sql)). Three-part names: this database's own catalog is `default` ([node doc](https://docs.rocketride.org/nodes/db_hotdata.md)). The `bm25_search` table argument form `'default.public.guests'` is my extrapolation from the docs' `'mydb.public.articles'`, so check it against `information_schema`.

**5. Gotchas.** The SQL surface is **read-only**; data enters only via loads ([node doc](https://docs.rocketride.org/nodes/db_hotdata.md)). A vector index with `embedding_provider_id` must be the **only** index on its table ([OpenAPI CreateIndexRequest](https://www.hotdata.dev/openapi.yaml)). Stored secrets only go to approved origins (OpenAI by default), so for Nebius **pass `api_key` inline** ([CreateEmbeddingProviderRequest](https://github.com/hotdata-dev/sdk-python/blob/main/docs/CreateEmbeddingProviderRequest.md)). No JSON operators, no UUID/ENUM types; unquoted identifiers fold to lowercase; one statement per call; `429` carries `Retry-After`; concurrent writes to one table get `409 RESOURCE_LOCKED` ([node doc](https://docs.rocketride.org/nodes/db_hotdata.md), [API ref](https://www.hotdata.dev/docs/api-reference)). Billing is per TB scanned.

**6. Load-bearing and repeated.** Load the live guest list per Event (re-load on every Luma sync with `mode=upsert`, `key=["attendee_id"]`). **Every Focus change re-ranks** via BM25 + vector, with the Struggle text as the query. Serve Inbox aggregates (keep rate by role/company, reply rate by template) as live SQL. RocketRide reads the ranked shortlist through its `db_hotdata` node or HTTP. **~1-1.5 h.**

---

## RocketRide

**1. What it is.** "An open-source runtime for AI pipelines. Pipelines are portable JSON ... executed by a multithreaded C++ core" ([docs](https://docs.rocketride.org/)), with a VS Code visual builder, 85+ nodes, and Python/TS/MCP SDKs; MIT license ([README](https://github.com/rocketride-org/rocketride-server)).

**2. Setup (Windows)**
1. Create an account at <https://staging.rocketride.ai> (per guide §5), redeem the event **coupon** for credits, and generate an **API key**. The web app has an API-key field and a credits/billing flow (`credits_balance`, `credits_checkout` in the [staging bundle](https://staging.rocketride.ai/)). Exact UI clicks: UNVERIFIED; the guide's linked "Guide"/YouTube are not recoverable.
2. `pip install rocketride` (1.3.0, deps: `websockets>=11`, `aiofiles`, `pydantic`; compatible with Orbit's pins) ([python](https://docs.rocketride.org/develop/python.md), [PyPI](https://pypi.org/pypi/rocketride/json)). This also installs the `rocketride` CLI (`validate`, `start`, `status`, `stop`) ([python](https://docs.rocketride.org/develop/python.md)).
3. Install the VS Code extension: search "RocketRide", or get it from [Open VSX](https://open-vsx.org/extension/RocketRide/rocketride). Pick **Local** to auto-run an engine, or sign in to Cloud ([README](https://github.com/rocketride-org/rocketride-server)).
4. Optional standalone engine: download `rocketride-server-<ver>-win64.zip` from [releases](https://github.com/rocketride-org/rocketride-server/releases), then run `engine.exe ./ai/eaas.py --host=127.0.0.1` (port 5565), and check with `curl.exe http://localhost:5565/ping` ([self-hosting](https://docs.rocketride.org/self-hosting.md)).
5. Env: `ROCKETRIDE_URI`, `ROCKETRIDE_APIKEY` (or `ROCKETRIDE_AUTH`), `ROCKETRIDE_NEBIUS_KEY` ([cloud](https://docs.rocketride.org/cloud.md), [Nebius preset](https://docs.rocketride.org/nodes/llm_openai_api.md)).
6. **Smoke test:** save the webhook `chat.pipe` below and run `rocketride start --pipeline ./chat.pipe`. It prints a webhook URL plus auth key; `curl` it ([webhook example](https://docs.rocketride.org/examples/webhook-pipeline.md)).

**3. Surface.** Pipelines are `*.pipe` JSON (`nodes[]` with `id`/`provider`/`config`/`input[{lane,from}]`), built visually in VS Code ([pipeline reference](https://docs.rocketride.org/pipeline-reference.md)). Sources: `webhook`, `chat`, `dropper`, `tools`. Invoke from Python via `RocketRideClient.use(filepath|pipeline=dict)` → `token` → `send()`/`chat()`, or over plain HTTP to the webhook URL. **Arbitrary HTTP: yes.** The `tool_http_request` node gives agents `http.http_request` (url, method, headers, `bearer_token`, `body_json`, `urlWhitelist` regex, default rate limits 10/s, 100/min, 5 concurrent) ([HTTP node](https://docs.rocketride.org/nodes/tool_http_request.md)). **Native sponsor nodes: `tool_cognee`, `graph_hydradb` (Cloud API), `db_hotdata`**, plus LLM `llm_nebius://` (Llama-3.3-70B / Qwen3-235B / DeepSeek-V3 profiles) ([nodes index](https://docs.rocketride.org/llms.txt)). Agents: `agent_rocketride` (Wave; requires `llm` + `memory` connections), CrewAI, LangChain, LlamaIndex, Deep Agents ([Wave node](https://docs.rocketride.org/nodes/agent_rocketride.md)). An MCP server package exposes pipelines as tools ([MCP](https://docs.rocketride.org/protocols/mcp.md)).

**4. Example** (Python calls from [develop/python](https://docs.rocketride.org/develop/python.md); pipeline shape from the [webhook example](https://docs.rocketride.org/examples/webhook-pipeline.md); node names from the [nodes index](https://docs.rocketride.org/llms.txt)):
```python
import asyncio, json, os
from rocketride import RocketRideClient

INBOX_PIPE = {   # sketch: wire it in the VS Code canvas, then export; exact config keys per node doc
  "project_id": "orbit-inbox",
  "nodes": [
    {"id": "src", "provider": "webhook"},
    {"id": "llm", "provider": "llm_openai_api", "config": {"profile": "llama-3-3-70b"}},   # Nebius preset
    {"id": "mem", "provider": "memory_internal"},
    {"id": "hydra", "provider": "graph_hydradb", "config": {"hydradb": {"database": "orbit"}}},
    {"id": "hot", "provider": "db_hotdata"},
    {"id": "http", "provider": "tool_http_request",
     "config": {"urlWhitelist": ["^https://api\\.resend\\.com/", "^https://orbit-api\\.onrender\\.com/"]}},
    {"id": "agent", "provider": "agent_rocketride", "input": [{"lane": "questions", "from": "src"}]},
    {"id": "out", "provider": "response", "input": [{"lane": "answers", "from": "agent"}]}
  ]
}

async def run_inbox_action(attendee: dict, focus: dict) -> dict:
    async with RocketRideClient(uri=os.environ["ROCKETRIDE_URI"],
                                auth=os.environ["ROCKETRIDE_APIKEY"]) as client:
        started = await client.use(pipeline=INBOX_PIPE)   # or filepath="pipelines/inbox.pipe"
        token = started["token"]
        try:
            return await client.send(token, json.dumps({"attendee": attendee, "focus": focus}),
                                     mimetype="application/json")
        finally:
            await client.terminate(token)
```
The agent↔tool/llm/memory **control connections** use a separate field from `input` lanes that I did not verify in the JSON reference. Build the pipe in the canvas and export it rather than hand-writing it ([pipeline reference](https://docs.rocketride.org/pipeline-reference.md)).

**5. Gotchas.** A cloud engine cannot reach `localhost` (risk 3). Cloud URIs must be `https://`/`wss://`, because `http://`/`ws://` "silently downgrades" ([cloud](https://docs.rocketride.org/cloud.md)). Staging URI: UNVERIFIED (see risks). The client substitutes `${ROCKETRIDE_*}` env vars into pipelines, so name secrets `ROCKETRIDE_RESEND_KEY` etc. ([python](https://docs.rocketride.org/develop/python.md)). Agents skip "remember to write" steps: an agent told to call `load_data` skipped it most of the time, so wire writes through lanes, not instructions ([db_hotdata node](https://docs.rocketride.org/nodes/db_hotdata.md)). The Wave agent is **experimental**. The Python tool node is a restricted `exec()` sandbox. Observability streams `tokens.*` as **billing** tokens (100 = $1), not LLM tokens ([observability](https://docs.rocketride.org/protocols/websocket/observability.md)).

**6. Load-bearing and repeated.** Every Inbox action ("email this person") runs the RocketRide pipeline: `graph_hydradb.recall_memory` (past outcomes) + `db_hotdata` (shortlist/aggregates) + `tool_cognee.recall` → Nebius drafts → `http_request` POSTs to Resend → writes the outcome back to HydraDB/Cognee. The first successful sequence becomes the Rote capture. **~2-3 h** (riskiest: new runtime, staging auth, control-connection wiring).

---

## Modiqo Rote

**1. What it is.** "Rote turns a successful agent run into a Play that is deterministic, cheaper in tokens, more secure, and easy to share" ([modiqo.ai](https://www.modiqo.ai/)). It is "not an agent harness"; it sits under Claude Code, Codex, Cursor, and others ([product.md](https://www.modiqo.ai/agent/product.md)). The "Play" skill finds, runs, and saves Plays; "Rote" is "the local engine running Plays, managing credentials and tool connections" ([modiqo/play](https://github.com/modiqo/play)).

**2. Setup (Windows = WSL2)**
1. The Rote Playoffs guide is <https://www.modiqo.ai/blog/the-playoffs>, with steps 01-06 at <https://www.modiqo.ai/blog/the-playoffs/getting-started>. Discord: <https://discord.gg/YyjBtzvhGz> ([the-playoffs](https://www.modiqo.ai/blog/the-playoffs)).
2. Optional: enable localhost interop by adding `[wsl2]` / `networkingMode=mirrored` to `%UserProfile%\.wslconfig`, then run `wsl --shutdown` ([MS Learn](https://learn.microsoft.com/en-us/windows/wsl/networking)).
3. `wsl -d Ubuntu-24.04`, then `sudo apt-get install -y python3 curl` and install `uv` (required, along with Python ≥3.10) ([modiqo/play](https://github.com/modiqo/play)).
4. `curl -fsSL https://getrote.dev/playoffs/install.sh | sh`. This wrapper pins `modiqo/play` v0.4.98 on the `playoffs` channel ([script](https://getrote.dev/playoffs/install.sh)). It installs Rote to `~/.rote/`, state to `~/.rote-play/`, and skills for each *detected* harness (e.g. `~/.claude/skills/play`) ([modiqo/play](https://github.com/modiqo/play)). Expect "PLAY INSTALLED / HARNESS DETECTED / READY TO SIGN IN". "`READY — SIGN IN TO CONTINUE` ... is a successful install" ([getting-started](https://www.modiqo.ai/blog/the-playoffs/getting-started)).
5. Sign in with Google/GitHub OAuth (`rote login`; check with `rote whoami`). Your username becomes your public namespace ([tutorial](https://www.modiqo.ai/agent/tutorial.md), [getting-started](https://www.modiqo.ai/blog/the-playoffs/getting-started)). For a headless WSL without a browser, run `rote login --provider github` then `rote provision --ttl 30` on a browser machine, and `rote claim '<token>'` in WSL ([modiqo/play](https://github.com/modiqo/play)).
6. **Hello warm-up:** in a harness, `/play run hello` (Claude). From the CLI: `rote play inspect https://play.modiqo.ai/modiqo/hello` then `rote play run https://play.modiqo.ai/modiqo/hello` ([tutorial](https://www.modiqo.ai/agent/tutorial.md)). Then post "ready & warmed up" in Discord (per the guide).
7. Free Community plan: up to 5 members, 1 personal namespace, 1 free org ([pricing](https://www.modiqo.ai/agent/pricing.md)).

**3. Surface.** CLI only; there is no SDK. "Reaches": **API adapters** created from OpenAPI/GraphQL/gRPC/Discovery/MCP (`rote adapter new <id> [spec]`, then `<id>_probe` / `<id>_call`), the **shell** (`rote proc run ...`), and a **browser** (`rote browse`). Priority order: adapter → shell + JSON → browser ([modalities](https://www.modiqo.ai/docs/07-modalities.md), [reference](https://www.modiqo.ai/docs/09-reference.md)). "No SDKs required" in practice means you point an adapter at an OpenAPI spec (FastAPI serves `/openapi.json`) or capture `curl` calls. Scriptable: `rote play run <uri|main.ts> k=v ... --output=json -y` (`-y` skips prompts for non-TTY) with `--resume <run_id>` and `--dry-run` ([reference](https://www.modiqo.ai/docs/09-reference.md)).

**Capture → replay** ([create your first play](https://www.modiqo.ai/docs/03-create-your-first-play.md)):
`rote init <name> --seq` (workspace "flight recorder") → do the work with recorded calls (each lands as `@N`) → `rote query @N '<jq>'` → `rote play pending write ...` → `rote workspace export <name> --params <p1,p2>` (filter failures, turn literals into typed params, resolve deps, fingerprint APIs, generate `main.ts` with a `steps:` DAG) → `rote play lint main.ts` → `rote play run main.ts p=...` → `rote play release` / `rote registry play push main.ts <org>`. Harness shortcut: `/play explore <task>` then `/play settle <capture-id> <label>` ([modiqo/play](https://github.com/modiqo/play)).

**4. Example** (Orbit outreach, commands per the docs above; run in WSL; host URL assumes mirrored networking):
```bash
rote init orbit-outreach --seq
rote proc run curl -s http://127.0.0.1:8001/api/attendees/123/context          # @1 Hydra+hotdata context
rote proc run curl -s -X POST http://127.0.0.1:8001/api/drafts -H 'content-type: application/json' \
  -d '{"attendee_id":123,"template":"intro_v2"}'                                # @2 Nebius draft
rote proc run curl -s -X POST http://127.0.0.1:8001/api/outreach/send -H 'content-type: application/json' \
  -d '{"attendee_id":123,"draft_ref":"..."}'                                    # @3 Resend via Orbit
rote workspace export orbit-outreach --params attendee_id,template
rote play lint main.ts
rote play run main.ts attendee_id=456 template=intro_v2 --output=json -y       # replay for a similar Attendee
```
From FastAPI on Windows, run `subprocess.run(["wsl.exe","-d","Ubuntu-24.04","--","rote","play","run",play,f"attendee_id={aid}","--output=json","-y"], capture_output=True)` (a standard `wsl.exe` invocation). The endpoint paths above are placeholders for Orbit routes you would add. Keep Resend and Nebius keys in Orbit, not in the Play; credentials otherwise stay in Rote's local stores and Plays "declare requirements but [do] not carry the user's secrets" ([tutorial](https://www.modiqo.ai/agent/tutorial.md)).

**5. Gotchas.** WSL-only; WSL→Windows localhost needs mirrored mode (risks 2). Play steps using `python3` run in WSL's Python ([create play](https://www.modiqo.ai/docs/03-create-your-first-play.md)). Every run requires explicit approval unless you pass `-y` ([modiqo/play](https://github.com/modiqo/play), [reference](https://www.modiqo.ai/docs/09-reference.md)). **Metrics:** reports give per-step ms and completed/failed/blocked counts ([run your first play](https://www.modiqo.ai/docs/01-run-your-first-play.md)); **no token counter is documented**. The 14,900 → ~300 reasoning-token figure is a vendor example ([product.md](https://www.modiqo.ai/agent/product.md)), not a runtime output.

**6. Load-bearing and repeated + the run#1 vs run#2 metric.** Run #1 has the RocketRide agent plan it: multiple LLM planning calls + a draft + send, all through Orbit's Nebius wrapper, which counts `usage.prompt_tokens/total_tokens` (OpenAI-compatible responses include `usage`, e.g. [Nebius embeddings](https://docs.tokenfactory.nebius.com/api-reference/examples/create-embeddings); chat usage on Nebius is UNVERIFIED but standard). On a reply, Orbit saves the sequence as a Play = the **Playbook**. Run #2+ for similar Attendees (same Role/Struggle per HydraDB) calls `rote play run ... --output=json` with zero planning calls (only the draft call, or a template fill with zero). Store `{wall_ms, llm_calls, tokens, steps}` per run in Postgres and chart run#1 vs run#N on `/home`. **~1.5-2.5 h + 30 min WSL.**

---

## Snyk

**1. What it is.** "A developer-first cybersecurity platform that helps teams build fast without compromising on security" (guide). The CLI covers `snyk test` (open source/SCA), `snyk code test` (SAST), IaC, and containers; the MCP server ships inside the CLI (v1.1298.0+) ([Claude Code guide](https://docs.snyk.io/agent-security/agentic-security-with-snyk-studio/quickstart-guides/claude-code-guide.md)).

**2. Setup (Windows, native, not WSL: "does not natively support WSL", [install](https://docs.snyk.io/developer-tools/snyk-cli/install-the-snyk-cli.md))**
1. Sign up at <https://app.snyk.io/login> ([plans](https://snyk.io/plans/)).
2. Install: `npm install snyk -g` (fastest here), or `scoop bucket add snyk https://github.com/snyk/scoop-snyk; scoop install snyk`, or download [snyk-win.exe](https://static.snyk.io/cli/latest/snyk-win.exe), rename it to `snyk.exe`, and add it to PATH ([install](https://docs.snyk.io/developer-tools/snyk-cli/install-the-snyk-cli.md)). Verify with `snyk --version`.
3. `snyk auth` (browser OAuth). For CI: `SNYK_TOKEN` ([auth](https://docs.snyk.io/developer-tools/snyk-cli/authenticate-to-use-the-cli.md)).
4. Enable Snyk Code: Web UI → **Settings → Snyk Code → Enabled → Save** (Org Admin) ([configure](https://docs.snyk.io/scan-fix-and-prevent/scan-with-snyk/snyk-code/configure-snyk-code.md)).
5. MCP for Claude Code: `npx -y snyk@latest mcp configure --tool=claude-cli` (add `--rule-type=smart-apply` for fewer scans), then verify with `/mcp` → View Tools (`snyk_sca_scan`, `snyk_code_scan`, ...). Manual alternative: in `~/.claude.json`, set `"Snyk": {"type":"stdio","command":"npx","args":["-y","snyk@latest","mcp","-t","stdio"]}` ([Claude Code guide](https://docs.snyk.io/agent-security/agentic-security-with-snyk-studio/quickstart-guides/claude-code-guide.md)). Note: the default "Secure at inception" rules get appended to your **global** Claude rules file.
6. **Smoke test / scans:**
   ```powershell
   cd backend;  pip install -r requirements.txt;  snyk test --file=requirements.txt --package-manager=pip --command=python
   cd ..\frontend;  snyk test          # pnpm-lock.yaml supported
   cd ..;  snyk code test               # SAST over Python + TS
   snyk test --all-projects             # both at once
   ```
   pip projects must be **installed first** because `requirements.txt` lists only top-level deps ([Python CLI](https://docs.snyk.io/supported-languages/supported-languages-list/python/snyk-cli-for-python.md), [test flags](https://docs.snyk.io/developer-tools/snyk-cli/commands/test.md)). `snyk code test` exit codes: 0 clean, 1 vulns found, 2 failure, 3 no supported project ([code test](https://docs.snyk.io/developer-tools/snyk-cli/commands/code-test.md)).

**3. Surface.** CLI, MCP (stdio or `snyk mcp -t sse`), IDE plugins, Web UI, API. Cloud service; the CLI runs locally.

**4. Example.** Not a runtime integration. Add `snyk test --all-projects && snyk code test` to `scripts/test.sh` (or a pre-ship step) so every build is scanned.

**5. Gotchas.** Free plan per month: **200 Open Source, 100 Code, 300 IaC, 100 Container tests** ([plans](https://snyk.io/plans/)); do not loop scans in CI. Snyk Code is off until enabled. Use `--command=python` if `python3` is not on PATH (Windows). Judges scan the app, so new sponsor SDKs (cognee's large dep tree, `neo4j`, `hotdata`, `rocketride`, `hydradb-sdk`) enlarge the SCA surface: rescan after adding each one. Never commit `.env`; SAST flags hard-coded secrets.

**6. Load-bearing and repeated.** Scan after every sponsor integration lands (6+ scans over the day), fix, and rescan; keep a before/after count in the README or demo. Running MCP inside Claude Code makes it continuous. **~30-60 min setup + fix time.**
