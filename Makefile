.PHONY: up down build logs restart seed test lint check clean \
        dev-api dev-web migrate migrate-create test-api test-web

# ── Colours ─────────────────────────────────────────────────────────────────
CYAN  := \033[0;36m
RESET := \033[0m

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'

# ── Docker operations ────────────────────────────────────────────────────────
up: ## Start all services (detached)
	docker compose up -d

down: ## Stop all services
	docker compose down

build: ## Build all Docker images (no cache)
	docker compose build --no-cache

logs: ## Tail logs from all services
	docker compose logs -f

restart: ## Restart all services
	docker compose restart

ps: ## Show running service status
	docker compose ps

# ── Local development (no Docker) ────────────────────────────────────────────
dev-api: ## Run FastAPI dev server locally (requires .venv activated)
	cd backend && uvicorn app.main:app --reload --port 8000

dev-web: ## Run Next.js dev server locally
	cd frontend && npm run dev

# ── Database ─────────────────────────────────────────────────────────────────
migrate: ## Run Alembic migrations to latest revision
	cd backend && alembic upgrade head

migrate-create: ## Create new Alembic migration (usage: make migrate-create name=add_foo)
	cd backend && alembic revision --autogenerate -m "$(name)"

migrate-down: ## Roll back one Alembic revision
	cd backend && alembic downgrade -1

migrate-history: ## Show Alembic migration history
	cd backend && alembic history --verbose

seed: ## Seed database with realistic synthetic data
	cd backend && python scripts/seed.py

seed-reset: ## Drop everything and re-seed (DESTRUCTIVE)
	cd backend && alembic downgrade base && alembic upgrade head && python scripts/seed.py

# ── Testing ───────────────────────────────────────────────────────────────────
test: ## Run all tests (backend + frontend)
	cd backend && pytest tests/ -v --cov=app --cov-report=term-missing
	cd frontend && npm test -- --passWithNoTests

test-api: ## Run backend tests only
	cd backend && pytest tests/ -v --cov=app --cov-report=term-missing

test-web: ## Run frontend tests only
	cd frontend && npm test -- --passWithNoTests

test-watch: ## Run backend tests in watch mode
	cd backend && pytest-watch tests/

# ── Code quality ─────────────────────────────────────────────────────────────
lint: ## Lint all code (ruff + mypy + eslint + tsc)
	cd backend && ruff check app/ && mypy app/ --strict
	cd frontend && npm run lint && npm run type-check

format: ## Auto-format all code (ruff + prettier)
	cd backend && ruff format app/ && ruff check --fix app/
	cd frontend && npm run format

check: ## Full CI gate — lint then test
	$(MAKE) lint
	$(MAKE) test

# ── Cleanup ───────────────────────────────────────────────────────────────────
clean: ## Remove build artifacts and caches
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .mypy_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	find . -name "*.pyo" -delete 2>/dev/null || true
	cd frontend && rm -rf .next node_modules/.cache

clean-all: clean ## Remove ALL generated files including node_modules and .venv
	cd frontend && rm -rf node_modules
	rm -rf backend/.venv
	docker compose down --volumes --remove-orphans
