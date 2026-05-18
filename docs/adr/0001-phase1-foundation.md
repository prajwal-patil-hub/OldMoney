# ADR 0001: Phase 1 Foundation Architecture

## Status
Accepted

## Date
2025-01-15

## Context

OldMoney is a local-first wealth intelligence platform targeted at family offices,
independent RIAs, and sophisticated individual investors who need Addepar/Bloomberg-grade
analytics without cloud lock-in or per-seat licensing.

The development environment is a Windows laptop with 16GB RAM running Docker Desktop.
The platform must:
- Boot to a usable UI in under 15 seconds on a cold Docker start
- Work entirely offline once set up (no external APIs required)
- Support multi-tenant data isolation from day one
- Feel like premium financial software — high information density, fast, refined
- Have a clear upgrade path from SQLite → PostgreSQL and from local Ollama → cloud AI

Phase 1 is a single developer building a functional MVP. Decisions should optimize for
iteration speed and correctness, not premature operational scale.

## Problem

Choosing the foundational technology stack requires making irreversible (or expensive-to-reverse)
decisions early. The core tensions are:

1. **Local-first vs. deployment-ready**: SQLite is perfect locally but PostgreSQL is standard in
   production. We must pick one or design for both from day one.

2. **AI abstraction depth**: LangChain provides breadth but introduces version churn and heavy
   abstraction that obscures prompt engineering. Rolling our own is more work but gives full control.

3. **Frontend state management**: Server state (API responses) and client state (UI selections,
   filters) have different lifetimes and invalidation logic. Conflating them leads to stale-data bugs.

4. **Analytics performance**: Financial analytics over 100k+ holdings rows must be fast enough
   for interactive filtering. Python Pandas is familiar but single-threaded.

5. **Background jobs**: Price refreshes, PDF parsing, and report generation are async workloads.
   Adding a full task queue (Celery + Redis) in Phase 1 doubles operational complexity.

## Options Considered

### Database Layer

**Option 1: PostgreSQL (Docker)**
- Pro: Production-grade, full SQL, native JSON, excellent full-text search
- Pro: No migration required when deploying to cloud
- Con: Requires a running Docker daemon on the dev machine
- Con: ~300MB RAM overhead for Postgres + connection pooler
- Con: Windows Docker volume performance for WAL writes is noticeably slow

**Option 2: SQLite with WAL mode (chosen)**
- Pro: Zero-config, single file, ships inside the Docker image
- Pro: WAL mode enables concurrent reads with one writer — sufficient for Phase 1
- Pro: `aiosqlite` driver works natively with SQLAlchemy async
- Pro: `sqlite-vec` extension provides vector search (replacing Qdrant in Phase 2)
- Con: One writer at a time — fine for < 50 concurrent users
- Con: Requires migration tooling (Alembic) to upgrade schema
- Upgrade path: `DATABASE_URL` env var swap to `postgresql+asyncpg://` with zero code changes

**Option 3: TigerBeetle**
- Pro: Extremely fast double-entry ledger
- Con: No SQL, no ORM, requires custom query layer
- Con: Immature Python client, poor Windows Docker support

**Decision: SQLite + WAL mode via `aiosqlite` + SQLAlchemy 2.x async**

### Frontend State Management

**Option 1: Redux Toolkit**
- Pro: Mature, DevTools excellent, large community
- Con: Verbose boilerplate even with RTK
- Con: No built-in server-state concept — must add RTK Query or similar
- Con: Overkill for Phase 1 surface area

**Option 2: Zustand + TanStack Query (chosen)**
- Pro: Zustand for client state is minimal (< 1KB gzipped)
- Pro: TanStack Query handles server state: caching, background refetch, stale-while-revalidate
- Pro: Clean separation: TanStack Query owns "what the server said", Zustand owns "what the user is doing"
- Pro: Both have excellent TypeScript support

**Option 3: Jotai**
- Pro: Atomic model, very composable
- Con: Smaller ecosystem, no built-in server state
- Con: Atomic model can make data-flow harder to trace in a financial app

**Decision: Zustand (client state) + TanStack Query (server state)**

### Analytics Engine

**Option 1: Pandas**
- Pro: Ubiquitous, huge ecosystem, every data scientist knows it
- Con: Single-threaded GIL-bound
- Con: Eager evaluation — materializes full dataframe before any operation
- Con: High memory use for wide holding tables

**Option 2: Polars + DuckDB (chosen)**
- Pro: Polars — Rust-based, multi-threaded, lazy evaluation, Arrow-native
- Pro: DuckDB — in-process SQL engine, runs directly on Parquet/CSV/Arrow without ingestion
- Pro: DuckDB can query SQLite files directly via the `sqlite` extension
- Pro: Both are zero-config — no server, no daemon
- Pro: Columnar storage means aggregations over 1M rows run in milliseconds

**Option 3: Apache Spark**
- Pro: Scales to petabytes
- Con: JVM + Spark overhead is 2–4GB RAM minimum
- Con: Overkill by 3 orders of magnitude for Phase 1 data volumes

**Decision: Polars for DataFrame operations + DuckDB for ad-hoc SQL analytics**

### AI Integration Layer

**Option 1: LangChain**
- Pro: Enormous ecosystem, many pre-built chains
- Con: Heavy abstraction makes prompt debugging opaque
- Con: Frequent breaking changes between minor versions (0.1 → 0.2 → 0.3)
- Con: Provider lock-in via LangChain's model wrapper layer
- Con: 150+ MB dependency tree

**Option 2: Custom provider abstraction (chosen)**
- Pro: Full control over prompt construction and response parsing
- Pro: Provider interface is a 50-line abstract base class — trivial to add new backends
- Pro: No transitive dependency churn
- Pro: Prompts are plain strings in the codebase, easy to review and version-control
- Implementation: `AIProvider` ABC → `OllamaProvider`, `OpenAIProvider`, `AnthropicProvider`

**Option 3: LlamaIndex**
- Pro: Excellent RAG primitives
- Con: Better suited to document-centric QA than structured financial data copilot
- Con: Still abstracts away prompt control

**Decision: Custom lightweight provider abstraction with Ollama as the default**

### Background Job Processing

**Option 1: Celery + Redis**
- Pro: Battle-tested, scales to thousands of workers
- Con: Requires Redis service — another Docker container, another port, more memory
- Con: Separate worker process makes local development harder
- Con: Overkill for Phase 1 job volume (price refreshes run every 15 minutes)

**Option 2: APScheduler + FastAPI BackgroundTasks (chosen)**
- Pro: In-process — no separate worker, no broker
- Pro: APScheduler cron syntax for scheduled jobs
- Pro: FastAPI `BackgroundTasks` for per-request async work (e.g., import processing)
- Con: Jobs share the API process — CPU-heavy jobs block the event loop unless run in threadpool
- Mitigation: Wrap CPU-bound analytics in `asyncio.to_thread()` / `run_in_executor()`

**Option 3: Temporal**
- Pro: Durable execution, workflow orchestration, excellent observability
- Con: Requires a Temporal server (Go binary + Postgres) — heavy for local dev
- Con: Phase 3+ complexity level

**Decision: APScheduler for scheduled jobs + FastAPI BackgroundTasks for request-scoped async work**

## Decision

### Confirmed Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| API Framework | FastAPI 0.115+ | Async-native, OpenAPI auto-docs, Pydantic v2 |
| ORM | SQLAlchemy 2.x async | Unified sync/async, Alembic migrations |
| Database | SQLite + WAL + aiosqlite | Zero-config, fast, upgradeable to PG |
| Auth | python-jose + argon2-cffi | JWT tokens, secure password hashing |
| Analytics | Polars + DuckDB | Fast columnar ops, in-process SQL |
| Background | APScheduler + BackgroundTasks | In-process, no broker needed |
| AI | Custom provider abstraction | Ollama default, pluggable backends |
| Frontend | Next.js 14 (App Router) | React Server Components, file-based routing |
| Styling | Tailwind CSS 3 + shadcn/ui | Utility-first, accessible component primitives |
| State | Zustand + TanStack Query v5 | Clean client/server state separation |
| Charts | Recharts + Visx | Composable, D3-backed, React-native |
| Testing (BE) | pytest + pytest-asyncio + httpx | Async test support, clean fixture model |
| Testing (FE) | Vitest + Testing Library | Fast, Vite-compatible, good DX |
| Linting (BE) | ruff + mypy --strict | Fast Rust linter, strict types |
| Linting (FE) | ESLint + TypeScript strict | Standard Next.js config |

## Architecture

### Module Structure

```
backend/app/modules/
├── auth/           # JWT (access 15m + refresh 30d), argon2 hashing, RBAC guards
├── organizations/  # Multi-tenant isolation, org settings, feature flags
├── portfolios/     # Portfolio + Account CRUD, hierarchy management
├── assets/         # Asset registry, price history, sector/class classification
├── holdings/       # Position tracking, lot-level cost basis, unrealized P&L
├── transactions/   # Trade ledger, corporate actions, cash flows
├── imports/        # CSV/Excel ingestion pipeline, validation, preview, dry-run
├── analytics/      # Polars + DuckDB analytical queries, return calculations
├── search/         # SQLite FTS5 global search across portfolios/assets/transactions
└── ai/             # Provider abstraction, copilot routes, embedding pipeline
```

### Security Model

Authentication uses a dual-token scheme:
- **Access token**: JWT, 15-minute TTL, stateless validation, contains `user_id` + `org_id` + `role`
- **Refresh token**: Opaque random bytes, 30-day TTL, stored in DB, rotated on each use

Multi-tenant isolation is enforced at two layers:
1. **Route layer**: `get_current_user` dependency extracts `org_id` from token
2. **Service layer**: Every DB query receives `org_id` and includes it in `WHERE` clause
3. **Audit log**: All mutations write to `audit_events` table with actor, action, resource, timestamp

RBAC roles (per organization):
- `OWNER` — full access including billing and user management
- `ADMIN` — full access except org deletion
- `ANALYST` — read/write portfolios, read-only on org settings
- `VIEWER` — read-only on everything

### Data Flow: Portfolio Analytics

```
Request → Auth middleware → Route handler
  → PortfolioService.get_performance(org_id, portfolio_id, date_range)
    → SQLAlchemy: fetch holdings + price history (filtered by org_id)
    → Polars DataFrame construction
    → DuckDB query for time-series aggregation
    → Return PerformanceResult Pydantic model
  → JSON response
```

### Performance Targets

| Operation | Target p95 |
|-----------|-----------|
| Cold Docker start to first HTTP response | < 15s |
| List holdings (100k rows, paginated) | < 200ms |
| Portfolio performance chart (2 years daily) | < 500ms |
| Global search (FTS5) | < 100ms |
| AI copilot first token | < 3s (Ollama on CPU) |
| Dashboard Time-to-Interactive | < 2s |

## Tradeoffs

**What we gain:**
- Zero external dependencies to run locally (except Docker)
- Sub-second analytics on realistic data volumes
- Full AI control without framework lock-in
- Clean module boundaries that survive to Phase 2

**What we give up:**
- Horizontal scaling of the API (SQLite writer contention above ~50 concurrent writers)
- Real-time collaborative editing (would need operational transform + Postgres LISTEN/NOTIFY)
- Advanced vector search (sqlite-vec is good but not Qdrant-grade at 10M+ vectors)
- Durable job execution (APScheduler jobs don't survive process crashes)

## What Was Deferred to Phase 2+

| Feature | Deferred Solution | Phase 1 Substitute |
|---------|------------------|-------------------|
| Redis caching | Redis + `fastapi-cache2` | TanStack Query stale-while-revalidate |
| PostgreSQL | `DATABASE_URL` swap | SQLite WAL |
| Vector search | Qdrant | `sqlite-vec` extension |
| Complex workflows | Celery / Temporal | APScheduler + BackgroundTasks |
| Full-text (advanced) | OpenSearch / Typesense | SQLite FTS5 |
| Observability | Grafana + Prometheus | `structlog` JSON logs |
| PDF parsing | Unstructured.io | `pdfminer.six` direct |
| Real-time prices | WebSocket feed | Scheduled polling (15m) |

## Rollback Plan

### If SQLite becomes a bottleneck
1. `alembic revision --autogenerate -m "pg_migration"` generates the schema diff
2. `DATABASE_URL` in `.env` is swapped to `postgresql+asyncpg://`
3. Data migrated with `pgloader` or a one-off script
4. No application code changes required (SQLAlchemy abstracts the dialect)

### If custom AI abstraction is insufficient
1. The `AIProvider` ABC is the only public interface; swap implementations without touching callers
2. LangChain can be added as an optional backend behind the same interface

### If APScheduler becomes unreliable
1. Jobs are idempotent by design (upsert, not insert)
2. A Celery worker can be added as a sidecar — routes stay identical since tasks are
   already defined as plain async functions

### If Polars/DuckDB are too heavy on constrained hardware
1. Analytical endpoints fall back to SQLAlchemy + Python aggregations
2. This is isolated to `modules/analytics/` — no cross-module changes needed

## Consequences

This ADR establishes the full Phase 1 dependency graph. Any new dependency that is not a
transitive dependency of the above stack requires a new ADR or explicit approval in a PR.

The module structure in `backend/app/modules/` is the authoritative boundary for Phase 1.
Cross-module imports must go through the module's public `__init__.py` exports, never by
importing internal submodules directly.
