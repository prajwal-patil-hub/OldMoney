# OldMoney — Local-First Wealth Intelligence Platform

> AI-native multi-asset portfolio analytics. Addepar-grade intelligence, runs on your laptop.

No cloud subscription. No per-seat fees. No data leaving your machine.

---

## Features

- **Multi-tenant organization system** — RBAC with Owner / Admin / Analyst / Viewer roles
- **Full portfolio hierarchy** — Organizations → Portfolios → Accounts → Holdings → Transactions
- **AI Copilot** — Ask questions about your portfolio in plain English (local Ollama or cloud fallback)
- **Global search** — Full-text search across all entities via `⌘K` command palette
- **CSV / Excel import** — Drag-and-drop ingestion with validation preview and dry-run mode
- **Analytics engine** — Time-weighted returns, attribution, allocation analysis via Polars + DuckDB
- **Price history** — 2 years of simulated history seeded; plug in real price feeds in Phase 2
- **Old Money aesthetic** — Addepar-grade density, dark-first design, Playfair Display + Inter
- **Fully offline** — No internet required after `docker compose up`
- **Windows-friendly** — Docker Desktop on Windows is first-class; Ollama via `host.docker.internal`

---

## Quick Start

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Docker Desktop | 4.x+ | Enable WSL2 backend on Windows |
| 8 GB RAM | — | 16 GB recommended with Ollama |
| Disk space | 3 GB | For images + database |

### 1. Clone and configure

```bash
git clone https://github.com/your-org/oldmoney.git
cd oldmoney
cp .env.example .env
```

Open `.env` and set a strong `SECRET_KEY` (32+ random characters):

```bash
# Generate one with Python:
python -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Start the stack

```bash
make up
```

First boot pulls images and runs migrations automatically. Takes ~60 seconds on first run.

| Service | URL |
|---------|-----|
| Web application | http://localhost:3000 |
| API (FastAPI) | http://localhost:8000 |
| Interactive API docs | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

### 3. Seed sample data

```bash
make seed
```

Creates a fully populated demo dataset:
- 3 organizations (family office, RIA, capital group)
- 10 users with different roles
- 10 portfolios with realistic mandates
- ~30 accounts across all portfolios
- ~500 holdings in 45 assets (equities, ETFs, bonds, crypto)
- ~10,000 transactions spanning 2 years

**Default logins:**

| Email | Password | Org | Role |
|-------|----------|-----|------|
| admin@pemberton.com | Password123! | Pemberton Capital | Owner |
| admin@ashworth.com | Password123! | Ashworth Family Office | Owner |
| admin@meridian.com | Password123! | Meridian Advisors | Owner |
| emily@pemberton.com | Password123! | Pemberton Capital | Analyst |

---

## Development

### Option A: Local development (no Docker)

Requires Python 3.11+ and Node 18+.

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

```bash
# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Option B: Docker with live reload

```bash
# Start services in detached mode
make up

# Tail logs
make logs

# Restart a single service after code changes
docker compose restart api
```

### Making database changes

```bash
# Create a new migration after editing models
make migrate-create name=add_benchmark_field

# Apply migrations
make migrate

# Roll back one step
make migrate-down
```

---

## AI Setup (Optional)

The AI Copilot works out of the box if Ollama is installed on the host machine.

### Install Ollama

Download from [ollama.ai](https://ollama.ai) for Windows, Mac, or Linux.

```bash
# Pull the default models
ollama pull llama3.1:8b          # ~4.7 GB — main reasoning model
ollama pull nomic-embed-text     # ~274 MB — document embeddings
```

### Configure

```env
# .env (already the default)
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_EMBED_MODEL=nomic-embed-text
```

On Docker, the API container reaches Ollama via `host.docker.internal:11434` automatically.

### Use a cloud model instead

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

No code changes — just swap the env vars and restart: `docker compose restart api`.

---

## Project Structure

```
oldmoney/
├── backend/                     # FastAPI application
│   ├── app/
│   │   ├── main.py              # App factory, middleware, lifecycle
│   │   ├── database.py          # SQLAlchemy async engine setup
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   ├── config.py            # Pydantic Settings
│   │   └── modules/
│   │       ├── auth/            # JWT, argon2, RBAC guards
│   │       ├── organizations/   # Multi-tenant isolation
│   │       ├── portfolios/      # Portfolio + Account management
│   │       ├── assets/          # Asset registry + price history
│   │       ├── holdings/        # Position tracking, cost basis
│   │       ├── transactions/    # Trade ledger
│   │       ├── imports/         # CSV/Excel ingestion pipeline
│   │       ├── analytics/       # Polars + DuckDB query engine
│   │       ├── search/          # SQLite FTS5 global search
│   │       └── ai/              # Provider abstraction + copilot
│   ├── migrations/              # Alembic migration scripts
│   ├── scripts/
│   │   └── seed.py              # Synthetic data seeder
│   ├── tests/                   # pytest test suite
│   ├── pyproject.toml           # Dependencies + tool config
│   ├── alembic.ini              # Alembic configuration
│   └── Dockerfile
│
├── frontend/                    # Next.js 14 (App Router) application
│   ├── app/                     # App Router pages and layouts
│   ├── components/              # Reusable UI components
│   │   ├── ui/                  # shadcn/ui primitives
│   │   ├── charts/              # Recharts wrappers with OldMoney theme
│   │   ├── tables/              # High-density data tables
│   │   └── command/             # ⌘K command palette
│   ├── lib/
│   │   ├── api/                 # TanStack Query hooks + fetch wrappers
│   │   └── store/               # Zustand stores (theme, nav, filters)
│   ├── styles/                  # Global CSS, design tokens
│   ├── public/                  # Static assets, fonts
│   ├── package.json
│   ├── tailwind.config.js       # Design system tokens wired to Tailwind
│   └── Dockerfile
│
├── data/                        # Database files (gitignored except .gitkeep)
├── docs/
│   ├── adr/                     # Architecture Decision Records
│   │   └── 0001-phase1-foundation.md
│   └── design-system.md         # Full design system specification
│
├── docker-compose.yml
├── Makefile
├── .env.example
└── README.md
```

---

## Commands Reference

| Command | Description |
|---------|-------------|
| `make up` | Start all Docker services (detached) |
| `make down` | Stop all services |
| `make build` | Rebuild Docker images (no cache) |
| `make logs` | Tail logs from all services |
| `make restart` | Restart all services |
| `make ps` | Show service status |
| `make dev-api` | Run FastAPI dev server locally (hot reload) |
| `make dev-web` | Run Next.js dev server locally |
| `make migrate` | Apply Alembic migrations |
| `make migrate-create name=foo` | Create new migration named `foo` |
| `make migrate-down` | Roll back one migration |
| `make seed` | Seed database with synthetic data |
| `make seed-reset` | Drop everything and re-seed (DESTRUCTIVE) |
| `make test` | Run full test suite (backend + frontend) |
| `make test-api` | Backend tests only |
| `make test-web` | Frontend tests only |
| `make lint` | Lint all code (ruff + mypy + eslint + tsc) |
| `make format` | Auto-format all code |
| `make check` | Full CI gate: lint + test |
| `make clean` | Remove build caches |
| `make clean-all` | Remove node_modules, .venv, and Docker volumes |

---

## Tech Stack

### Backend

| Component | Technology | Why |
|-----------|-----------|-----|
| API framework | FastAPI 0.115+ | Async, OpenAPI auto-docs, Pydantic v2 |
| ORM | SQLAlchemy 2.x (async) | Unified async, Alembic migrations |
| Database | SQLite + WAL + aiosqlite | Zero-config, upgradeable to PG |
| Auth | python-jose + argon2-cffi | JWT, secure password hashing |
| Analytics | Polars + DuckDB | Columnar, multi-threaded, in-process SQL |
| Validation | Pydantic v2 | Fast, strict typing |
| Background | APScheduler | In-process scheduler, no broker needed |
| AI | Custom provider abstraction | Ollama default, OpenAI/Anthropic fallbacks |
| Linting | ruff + mypy --strict | Fast Rust linter, full type checking |
| Testing | pytest + pytest-asyncio + httpx | Async test support |

### Frontend

| Component | Technology | Why |
|-----------|-----------|-----|
| Framework | Next.js 14 (App Router) | RSC, streaming, file routing |
| Language | TypeScript (strict) | Full type safety |
| Styling | Tailwind CSS 3 + shadcn/ui | Utility-first, accessible primitives |
| Server state | TanStack Query v5 | Cache, revalidation, optimistic updates |
| Client state | Zustand | Minimal, typed, no boilerplate |
| Charts | Recharts + Visx | Composable, D3-backed, React-native |
| Forms | react-hook-form + zod | Performant, type-safe validation |
| Command palette | cmdk | Accessible, fast, composable |
| Testing | Vitest + Testing Library | Fast, Vite-compatible |

---

## Architecture

### Multi-tenancy

Every database row carrying financial data has an `org_id` foreign key. The `get_current_user` FastAPI dependency extracts `org_id` from the JWT and injects it into every service call. No query runs without a tenant filter.

### Security

- **Passwords**: argon2id hashing (winner of Password Hashing Competition)
- **Tokens**: JWT access tokens (15 min TTL) + opaque refresh tokens (30 days, stored in DB, rotated on use)
- **RBAC**: Enforced at route AND service layer — not just middleware
- **Audit log**: Every mutation writes to `audit_events` table

### Performance

| Operation | Target | Method |
|-----------|--------|--------|
| Cold start | < 15s | SQLite vs PG, no connection pool warm-up |
| Holdings list (100k rows) | < 200ms p95 | Indexed pagination, projection |
| Portfolio performance chart | < 500ms | Polars lazy evaluation + DuckDB |
| Global search | < 100ms | SQLite FTS5 with BM25 ranking |
| AI first token | < 3s | Ollama llama3.1:8b on CPU |

---

## Color Palette

The "Old Money" palette — inspired by aged leather, polished brass, cream parchment, and merchant red.

| Name | Light Mode | Dark Mode | Usage |
|------|-----------|----------|-------|
| Background | `#FAF6F1` Antique White | `#0F0A09` Night | Page background |
| Surface | `#FFFFFF` | `#1A1210` | Cards, panels |
| Primary | `#7C2220` Falu Red | `#9F3533` | CTAs, accents |
| Accent Gold | `#9F6920` Golden Brown | `#DAA755` Rob Roy | Financial highlights |
| Text Primary | `#1A0F0D` | `#F1DEA8` Buttermilk | Body text |
| Positive | `#2D6A4F` | `#52B788` | Gains, positive returns |
| Negative | `#9D2121` | `#E57373` | Losses, negative returns |

Full design system: [`docs/design-system.md`](docs/design-system.md)

---

## Architecture Decisions

See [`docs/adr/`](docs/adr/) for the full ADR log.

- [ADR 0001](docs/adr/0001-phase1-foundation.md) — Phase 1 foundation: SQLite, Polars/DuckDB, custom AI abstraction, APScheduler

---

## Contributing

1. Branch from `main`: `git checkout -b feat/your-feature`
2. Run `make check` before pushing (lint + test gate)
3. Open a PR — include a summary of what changed and why

### Code style

- **Python**: `ruff` (formatting + linting) + `mypy --strict`. No `Any` without comment.
- **TypeScript**: ESLint strict + `tsc --noEmit`. No `any` without `// eslint-disable-line`.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)

---

## Roadmap

### Phase 1 (current) — Foundation
- Core CRUD: portfolios, accounts, holdings, transactions
- Authentication + RBAC
- SQLite analytics
- AI Copilot (Ollama)
- CSV import
- OldMoney design system

### Phase 2 — Intelligence
- Real-time price feeds (Polygon.io, yfinance)
- Vector search with sqlite-vec (semantic portfolio search)
- PDF statement parsing
- Performance attribution (Brinson model)
- Benchmark comparison (S&P 500, custom)
- Export: PDF reports, Excel

### Phase 3 — Scale
- PostgreSQL migration path
- Redis caching
- Celery for long-running jobs
- Multi-currency support
- WebSocket real-time updates
- Mobile-responsive layout

---

## License

MIT — see `LICENSE` file.
