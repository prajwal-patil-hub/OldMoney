FROM python:3.12-slim AS base
WORKDIR /app

# ── System deps (libmagic for MIME detection) ──────────────────────────────
RUN apt-get update \
    && apt-get install -y --no-install-recommends libmagic1 curl \
    && rm -rf /var/lib/apt/lists/*

# ── Non-root user ──────────────────────────────────────────────────────────
RUN groupadd --system --gid 1001 appgroup \
    && useradd --system --uid 1001 --gid appgroup --no-create-home appuser

# ── Python dependencies (installed as root, before switching users) ────────
COPY pyproject.toml .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -e ".[dev]"

# ── Application code ───────────────────────────────────────────────────────
COPY --chown=appuser:appgroup . .

# ── Data directory writable by appuser ────────────────────────────────────
RUN mkdir -p data && chown appuser:appgroup data

# ── Drop privileges ────────────────────────────────────────────────────────
USER appuser

EXPOSE 8000

# Health check using curl (installed above)
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--workers", "1", "--no-access-log"]
