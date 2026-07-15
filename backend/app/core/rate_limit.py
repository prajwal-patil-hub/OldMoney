"""Single shared rate limiter for the whole app.

Previously three independent Limiter() instances existed (main, auth, ai) each
with its own in-memory counters and only one wired to the 429 handler. This
module is the one source of truth; routers import `limiter` from here, and
`default_limits` applies a baseline cap to every endpoint (including the
otherwise-unbounded portfolios/holdings/transactions/imports/search routes).
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
)
