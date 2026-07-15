"""Single shared rate limiter for the whole app.

Previously three independent Limiter() instances existed (main, auth, ai) each
with its own in-memory counters and only one wired to the 429 handler. This
module is the one source of truth; routers import `limiter` from here and apply
`@limiter.limit(...)` to the abuse-prone endpoints.

Note: slowapi's global `default_limits`/SlowAPIMiddleware cannot resolve
handlers nested inside FastAPI `include_router` mounts (it exempts them), so a
global default silently does nothing here. Per-route decorators are the
reliable mechanism, so the hot write/bulk/query endpoints are decorated
explicitly. `WRITE_LIMIT` / `BULK_LIMIT` centralize those values.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

limiter = Limiter(key_func=get_remote_address)

# Reusable limit strings, derived from config, for @limiter.limit decorators.
WRITE_LIMIT = f"{settings.RATE_LIMIT_PER_MINUTE}/minute"
BULK_LIMIT = f"{max(5, settings.RATE_LIMIT_PER_MINUTE // 6)}/minute"
