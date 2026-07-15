# OldMoney — Production Readiness Audit

**Date:** 2026-07-15 · **Branch:** `claude/oldmoney-phase1-foundation-6eWFN`
**Method:** full-codebase static review (frontend + backend), 196-test backend suite, TypeScript strict check, and live browser E2E passes against seeded data.

This report treats every mock, placeholder, hardcoded value, and shortcut as a defect, per the review mandate. Items already fixed on this branch during the review are listed in §6 for the record.

---

## 1. Production Blockers (Critical)

| # | Location | Finding | Why it blocks launch | Recommended fix | Effort |
|---|----------|---------|----------------------|-----------------|--------|
| C1 | `backend/app/core/config.py:23-37` | Default `SECRET_KEY` is a publicly known string; the validator only **warns** and boots anyway | Anyone can forge JWT access tokens for any user/org/role → total auth bypass | Hard-fail startup when `DEBUG=False` and the key is in `_KNOWN_WEAK_KEYS` or < 32 chars | S |
| C2 | `frontend/src/app/(auth)/login/page.tsx:65-86`, `register/page.tsx:98-119`, `lib/api.ts` 401-interceptor demo branch | "Continue as Demo" injects a forged client-side session (`demo-token-mock`) and the API interceptor special-cases `demo-` token prefixes | Ships an intentional auth-bypass UX into production; also trains users on a mode that shows no real data | Gate behind `NEXT_PUBLIC_DEMO_MODE` env flag (default off) or remove; delete the interceptor branch with it | S |
| C3 | `backend/app/modules/transactions/{router,service}.py`, `holdings/service.py`, `holdings/repository.py:27-38` | Create-transaction / upsert-holding accept caller-supplied `account_id` / `portfolio_id` / `asset_id` **without verifying org ownership**; `get_by_unique` doesn't filter by `org_id` | Cross-tenant IDOR on write: one org can inject transactions/holdings into another org's portfolio — unacceptable data-integrity breach for a multi-tenant financial platform | Resolve and assert ownership of all three IDs against the token's `org_id` before any write (portfolios module already has the pattern) | M |
| C4 | `backend/app/modules/transactions/service.py:87-109` + `dashboard/service.py:119-151` | Holdings accounting is delta-rows-per-trade-date: SELL rows store **sale proceeds as `cost_basis`** (wrong sign/meaning), no realized P&L exists, average cost is never maintained, and `get_performance` prices *today's* net position against historical dates (not positions as they existed) | Unrealized G/L and the performance series are financially incorrect — the core numbers a portfolio platform exists to report | Introduce a proper position ledger: maintain running position + average cost per (account, asset); compute realized P&L on sells; make performance use position-as-of-date | L |

> Note on C4: summing delta rows does yield correct *current AUM* (verified numerically), so headline AUM is right — but holding counts, per-row cost basis after sells, and the historical performance curve are not.

## 2. High

| # | Location | Finding | Risk | Fix | Effort |
|---|----------|---------|------|-----|--------|
| H1 | `backend/app/core/database.py:55-63` | Session teardown attempts a **second `commit()` inside `except`** before rollback | A failed multi-write request (e.g. transaction + holding) can persist half its writes | Rollback on error, full stop; move audit writes to a separate session | S |
| H2 | All routers except `auth`/`ai` | **No rate limiting** on portfolios/holdings/transactions/assets/imports/search/dashboard/orgs; `RATE_LIMIT_PER_MINUTE` config exists but is referenced nowhere; 3 independent `Limiter` instances | Unthrottled bulk-write (`/imports/commit`) and query endpoints; config is dead | One shared limiter with `default_limits`, wire config values, keep stricter auth/ai overrides | M |
| H3 | `backend/app/modules/transactions/service.py:173`, `router.py:47-51` | CSV export loads up to **100,000 rows into one in-memory string**; `iter([csv_content])` is fake streaming; endpoint unthrottled | Memory-exhaustion DoS vector | True row-batch streaming generator + rate limit + auth-scoped row cap | M |
| H4 | `backend/app/modules/portfolios/service.py:135-140`, `assets/service.py:102-107` | **Soft-delete doesn't cascade** — a deleted portfolio's holdings/transactions stay live | Deleted portfolios still contribute to AUM, allocation, search | Cascade `deleted_at` to children in the same transaction; add regression tests | M |
| H5 | `backend/app/core/database.py:14-33` | SQLite + `StaticPool` = single writer, and no `busy_timeout` pragma | Concurrent writes → `database is locked` 500s under real load | Add `busy_timeout`; plan Postgres migration for production (Alembic already in place) | M (timeout) / L (Postgres) |
| H6 | `backend/app/modules/transactions/schemas.py:19-23` | `quantity/price/gross_amount/net_amount` accept any sign; client-supplied `net_amount` is **never reconciled** against `quantity×price±fees`, then flows into cost basis | Garbage-in financial records; negative-price trades accepted | Server-side recompute/validate amounts; reject inconsistent rows | S |
| H7 | `backend/app/core/security.py` + `auth/service.py:211` | Access tokens carry a `jti` that is never checked; logout/password-change only revoke refresh tokens | Stolen 15-min access token stays valid after password change | jti denylist (in-process LRU or Redis) checked in `get_current_user` | M |
| H8 | `frontend/src/app/(app)/ownership/page.tsx` | Entire Ownership page renders **hardcoded fictional entities/values** ("Whitmore Family Trust", fixed $M figures); labeled "Demo data" but no API exists | A family-office user can mistake fabricated financial structure for real data | Keep the badge but add an empty-state path; build backend entity model (`ownership.py` table exists, unused) in Phase 2 | L |
| H9 | `frontend/src/store/auth.store.ts:54` | `setAuth` hardcodes `activeOrgRole: 'owner'` for every login | Client-side role gating (invite/remove member buttons) shows owner UI to everyone; server must reject, but UX lies | Derive role from the login response membership; keep server enforcement as the real boundary | S |

## 3. Medium

| # | Location | Finding | Fix | Effort |
|---|----------|---------|-----|--------|
| M1 | `backend/app/main.py:55-70` vs `alembic/` vs `scripts/seed.py:320-412` | **Three divergent schema definitions**: runtime `create_all`, Alembic migrations, and seed.py's hand-written SQL (which does NOT match the ORM at all — integer PKs vs UUIDs) | Make Alembic the single source; delete or rewrite `scripts/seed.py` (superseded by `seed_api.py`) | M |
| M2 | `assets/service.py:79`, `holdings/service.py:117,145-168`, `portfolios/service.py:216-220`, `organizations/service.py:137-153`, `auth/service.py:256-262` | **N+1 query patterns** throughout (per-row latest-price and per-member user lookups; holdings summary loops up to 10,000 rows × 2 queries) | Batch with window-function/lateral latest-price query and `IN`-clause user fetches | M |
| M3 | `backend/app/core/middleware.py:135-136` | Audit-log middleware swallows all exceptions silently | Log at error level + metric counter; consider failing closed for financial mutations | S |
| M4 | `backend/app/modules/ai/service.py:239-241,325-326` | Raw `str(e)` internal errors returned/streamed to end users | Map to generic messages; log details server-side | S |
| M5 | `backend/app/main.py:78-82` | Scheduled `rebuild_search_index` job is a **no-op stub** — FTS index never rebuilds | Implement reindex or remove the job (misleading log line) | S |
| M6 | `frontend/src/app/(app)/imports/page.tsx:13-27` | Import History is a permanent empty stub (state never populated, no backend table) | Add `import_jobs` table + list endpoint, or populate local history from commit results | M |
| M7 | `frontend/src/store/auth.store.ts` | Access token in `sessionStorage` — XSS-exfiltratable | Acceptable trade-off short-term; httpOnly-cookie session is the stronger pattern | M |
| M8 | `frontend/src/lib/hooks/*` (12 sites) | `as unknown as Record<string, unknown>` casts around every API response — backend shapes aren't captured in typed contracts | Generate types from OpenAPI (`openapi-typescript`) and delete manual normalizers where possible | M |
| M9 | `backend/app/modules/dashboard/service.py:27-30` | Raw SQL assumes UUIDs stored as dash-less hex; a driver change silently zeroes all metrics | Centralize UUID-to-storage conversion; add a canary test | S |
| M10 | `portfolios/service.py:224-225`, `holdings/service.py` | Summary math silently substitutes **cost basis as market value** when no price exists | Track and expose a `priced_coverage` ratio; flag unpriced positions in UI | S |
| M11 | `holdings/models.py:16` | Unique constraint `(account, asset, as_of_date)` ignores `deleted_at` → re-insert after soft-delete hits UNIQUE violation | Partial index excluding soft-deleted rows (Postgres) or include `deleted_at` sentinel | S |
| M12 | `frontend/src/app/(app)/settings/page.tsx` role maps | Backend role vocabulary (SUPERADMIN/ORG_ADMIN/ANALYST/…) ≠ frontend (owner/admin/member/viewer); translation exists but lossy (ADVISOR/ANALYST both → "member") | Unify the role enum across the stack | M |
| M13 | `backend/app/modules/organizations/service.py:40-47` | `plan` accepts arbitrary strings | Enum-validate (`free/pro/enterprise`) | S |
| M14 | Three `Limiter()` instances (`main.py:95`, `auth/router.py:26`, `ai/router.py:19`) | Independent in-memory stores; only main one wired to the 429 handler | Single shared limiter module | S |
| M15 | `frontend/src/components/shared/ErrorBoundary.tsx` | Errors go only to browser console — no Sentry/reporting wired anywhere | Add error-reporting SDK behind env flag | S |

## 4. Low

| # | Location | Finding | Effort |
|---|----------|---------|--------|
| L1 | `backend/app/modules/search/service.py:40-57` | Dead code: first SQL/`in_clause` built then unconditionally overwritten | S |
| L2 | `backend/app/core/config.py` | Unused config keys: `DATABASE_POOL_SIZE`, `RATE_LIMIT_PER_MINUTE`, `AUTH_RATE_LIMIT_PER_MINUTE` | S |
| L3 | `backend/app/modules/portfolios/ownership.py` | `OwnershipEdge` model registered but no service/router uses it | S |
| L4 | `backend/app/modules/ai/provider.py:86,91,118,151` | Magic numbers: temperature 0.7, timeouts 120s/5s hardcoded | S |
| L5 | `backend/app/core/config.py:60` + `main.py:126-133` | CORS dev-origin defaults with `allow_credentials=True` and wildcard methods/headers | S |
| L6 | `auth/router.py:30`, `middleware.py:149-152` | `X-Forwarded-For` trusted for audit IP without proxy allowlist (logging only) | S |
| L7 | `frontend/src/app/layout.tsx:66` | Empty `catch (_) {}` in theme bootstrap script | S |
| L8 | `frontend/src/app/(app)/settings/page.tsx:646-657` | "Sign out all sessions coming soon" toast stub; "API Keys / Audit Log" placeholder section | S |
| L9 | `scripts/seed_api.py:34`, `scripts/seed.py:71,166-175` | Hardcoded demo credentials in dev tooling (must never run against prod) | S |
| L10 | `backend/app/modules/organizations/service.py:27-31` | `_slugify` can emit empty slug for all-symbol names | S |
| L11 | `frontend` charts/AI page | `dangerouslySetInnerHTML` ×2 — **both verified safely sanitized** (entity-escape before controlled tag re-injection; static theme script) — informational | — |
| L12 | `backend/app/modules/auth` | No `iss`/`aud` claims in JWTs (only `type` checked) | S |

**Explicitly verified clean:** no TODO/FIXME/HACK comments anywhere; no `console.log` debugging (2 legitimate `console.error` sites); no `@ts-ignore`/`any`; no SQL injection (all `text()` queries parameter-bound — the f-string fragments are constant literals); no fake charts or `Math.random()` dashboard data remaining; loading states comprehensive; upload validation strong (extension+MIME+traversal+size); refresh-token reuse detection, account lockout, and constant-time login checks all present and correct.

## 5. Production-Readiness Review Summary

| Dimension | Verdict |
|---|---|
| Functional (core flows) | **Good** — auth, portfolios, transactions, assets, imports, dashboard all work end-to-end against real data (browser-verified) |
| Business-logic correctness | **Weak** — C4: sell-side cost basis, realized P&L, historical performance semantics |
| Asset valuation | **Fair** — latest-price valuation works; cost-basis fallback silently mixes bases (M10) |
| Authentication | **Fair** — solid fundamentals undermined by C1 default key and C2 demo bypass |
| Authorization | **Weak on writes** — C3 cross-tenant write IDOR; reads consistently org-scoped |
| Security posture | **Fair** — good input validation and no injection, but C1/C3/H7 outstanding |
| API integration (FE↔BE) | **Fair** — works, but shape drift is recurring; M8 typed contracts needed |
| Database | **Weak for prod** — SQLite single-writer (H5), schema drift (M1), soft-delete gaps (H4/M11) |
| Performance | **Fair** — N+1s (M2) and unbounded export (H3) will not survive real data volumes |
| Error handling | **Fair** — mostly surfaced to users; a few swallows (M3) and leaks (M4) |
| Accessibility/Responsive | **Good** — aria labels, keyboard paths, skeletons; not exhaustively tested |
| Maintainability | **Fair** — clean module structure; three schema sources and manual normalizers drag it down |

### Counts

- **Production blockers (Critical): 4**
- **High: 9**
- **Medium: 15**
- **Low: 12**

### Overall production-readiness score: **48 / 100**

Excellent demo/MVP; not launchable as a financial system of record until the four blockers are cleared — chiefly the forgeable default JWT key, the demo auth bypass, cross-tenant write isolation, and the position-accounting model.

## 6. Fixed during this review (this branch)

- Import pipeline unusable with real bank/brokerage files (required internal UUIDs in CSV) → wizard portfolio selector + backend fallback resolution
- Imports bypassed holdings bookkeeping (repository write) → routed through `TransactionService`
- Unknown symbols silently dropped → auto-created assets (+ price point seeded from trade price so positions value immediately; AUM verified +$8,580 on a 120×