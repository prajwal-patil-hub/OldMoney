"""
Seed OldMoney with demo data THROUGH THE RUNNING API.

Unlike scripts/seed.py (which writes a simplified raw-SQLite schema that does
NOT match the app's real UUID-based ORM schema), this script drives the actual
FastAPI endpoints. Everything it creates is therefore guaranteed to be readable
by the running app — users, org, assets, portfolios, transactions, holdings
(auto-derived from BUY/SELL), and recent prices for current-value math.

Prerequisites:
    The backend must already be running:
        cd backend
        uv run uvicorn app.main:app --reload

Usage:
    cd backend
    uv run python scripts/seed_api.py

Then log in at http://localhost:3000 with:
    Email:    demo@oldmoney.app
    Password: DemoPass123
"""

from __future__ import annotations

import random
import sys
from datetime import date, timedelta

import httpx

BASE_URL = "http://localhost:8000/api/v1"
DEMO_EMAIL = "demo@oldmoney.app"
DEMO_PASSWORD = "DemoPass123"
DEMO_NAME = "Demo User"

random.seed(42)

# ── Asset universe (subset — enough to look real without being huge) ──────────
ASSETS = [
    {"symbol": "AAPL",  "name": "Apple Inc.",                "asset_type": "EQUITY", "sector": "Technology",             "price": 228.50},
    {"symbol": "MSFT",  "name": "Microsoft Corp.",           "asset_type": "EQUITY", "sector": "Technology",             "price": 441.20},
    {"symbol": "GOOGL", "name": "Alphabet Inc.",             "asset_type": "EQUITY", "sector": "Technology",             "price": 178.30},
    {"symbol": "AMZN",  "name": "Amazon.com Inc.",           "asset_type": "EQUITY", "sector": "Consumer Discretionary", "price": 197.10},
    {"symbol": "NVDA",  "name": "NVIDIA Corp.",              "asset_type": "EQUITY", "sector": "Technology",             "price": 128.40},
    {"symbol": "JPM",   "name": "JPMorgan Chase & Co.",      "asset_type": "EQUITY", "sector": "Financials",             "price": 212.60},
    {"symbol": "JNJ",   "name": "Johnson & Johnson",         "asset_type": "EQUITY", "sector": "Healthcare",             "price": 158.90},
    {"symbol": "BRK.B", "name": "Berkshire Hathaway B",      "asset_type": "EQUITY", "sector": "Financials",             "price": 452.30},
    {"symbol": "SPY",   "name": "SPDR S&P 500 ETF Trust",    "asset_type": "ETF",    "sector": "Broad Market",           "price": 566.80},
    {"symbol": "QQQ",   "name": "Invesco QQQ Trust",         "asset_type": "ETF",    "sector": "Technology",             "price": 486.10},
    {"symbol": "AGG",   "name": "iShares Core US Agg Bond",  "asset_type": "ETF",    "sector": "Fixed Income",           "price": 98.20},
    {"symbol": "GLD",   "name": "SPDR Gold Shares",          "asset_type": "ETF",    "sector": "Commodities",            "price": 241.70},
    {"symbol": "BTC",   "name": "Bitcoin",                   "asset_type": "CRYPTO", "sector": "Cryptocurrency",         "price": 61250.00},
    {"symbol": "ETH",   "name": "Ethereum",                  "asset_type": "CRYPTO", "sector": "Cryptocurrency",         "price": 3380.00},
]

# ── Portfolios and which symbols they hold ────────────────────────────────────
PORTFOLIOS = [
    {"name": "Growth Fund",      "description": "Long-only US equity growth mandate.",
     "symbols": ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "QQQ"]},
    {"name": "Balanced 60/40",   "description": "60% equity / 40% fixed income, capital preservation.",
     "symbols": ["SPY", "AGG", "JPM", "JNJ", "BRK.B"]},
    {"name": "Alternatives",     "description": "Crypto and real-asset diversification sleeve.",
     "symbols": ["BTC", "ETH", "GLD", "SPY"]},
]


def check(resp: httpx.Response, what: str) -> dict:
    if resp.status_code >= 400:
        print(f"  ✗ {what} failed [{resp.status_code}]: {resp.text[:300]}")
        raise SystemExit(1)
    body = resp.json()
    return body.get("data", body)


def main() -> None:
    print("\n" + "=" * 56)
    print("  OldMoney API Seeder")
    print("=" * 56)

    try:
        client = httpx.Client(base_url=BASE_URL, timeout=30.0)
        client.get("http://localhost:8000/health", timeout=3.0)
    except Exception:
        print("\n  ✗ Backend not reachable at http://localhost:8000")
        print("    Start it first:  cd backend && uv run uvicorn app.main:app --reload\n")
        raise SystemExit(1)

    # ── 1. Register (ignore 'already exists') ─────────────────────────────────
    print("\n[1/6] Registering demo user...")
    r = client.post("/auth/register", json={
        "email": DEMO_EMAIL, "password": DEMO_PASSWORD, "full_name": DEMO_NAME,
    })
    if r.status_code == 409:
        print("  • User already exists — reusing it.")
    elif r.status_code >= 400:
        print(f"  ✗ register failed [{r.status_code}]: {r.text[:300]}")
        raise SystemExit(1)
    else:
        print(f"  ✓ Created {DEMO_EMAIL}")

    # ── 2. Login ──────────────────────────────────────────────────────────────
    print("\n[2/6] Logging in...")
    data = check(client.post("/auth/login", json={
        "email": DEMO_EMAIL, "password": DEMO_PASSWORD,
    }), "login")
    token = data["access_token"]
    auth = {"Authorization": f"Bearer {token}"}
    print("  ✓ Authenticated")

    # ── 3. Ensure an org + org-scoped token ───────────────────────────────────
    print("\n[3/6] Setting up organization...")
    orgs = check(client.get("/orgs", headers=auth), "list orgs")
    if orgs:
        org = orgs[0]
        print(f"  • Using existing org '{org['name']}'")
    else:
        org = check(client.post("/orgs", json={
            "name": "Demo Family Office", "slug": "demo-family-office",
        }, headers=auth), "create org")
        print(f"  ✓ Created org '{org['name']}'")

    switched = check(client.post(f"/orgs/{org['id']}/switch", headers=auth), "switch org")
    org_token = switched["access_token"]
    oauth = {"Authorization": f"Bearer {org_token}"}

    # ── 4. Assets (+ 180 days of price history for performance charts) ────────
    print("\n[4/6] Creating assets & price history...")
    existing_assets = check(client.get("/assets", params={"page_size": 200}, headers=oauth), "list assets")
    by_symbol = {a["symbol"]: a for a in existing_assets}
    asset_ids: dict[str, str] = {}

    for a in ASSETS:
        if a["symbol"] in by_symbol:
            asset = by_symbol[a["symbol"]]
        else:
            asset = check(client.post("/assets", json={
                "symbol": a["symbol"], "name": a["name"],
                "asset_type": a["asset_type"], "sector": a["sector"], "currency": "USD",
            }, headers=oauth), f"create asset {a['symbol']}")
        asset_ids[a["symbol"]] = asset["id"]
    print(f"  ✓ {len(asset_ids)} assets ready")

    # Generate 180 days of daily prices per asset (random walk ending at
    # today's price) and bulk-upload as one CSV — this is what makes the
    # dashboard/portfolio performance charts draw a real curve.
    HISTORY_DAYS = 180
    today_d = date.today()
    lines = ["date,symbol,close"]
    for a in ASSETS:
        vol = 0.035 if a["asset_type"] == "CRYPTO" else 0.015
        # Walk backwards from today's price so the series ends exactly at it.
        px = a["price"]
        series: list[tuple[date, float]] = [(today_d, px)]
        for i in range(1, HISTORY_DAYS + 1):
            px = px / (1 + random.gauss(0.0006, vol))  # invert a daily return
            px = max(px, 0.01)
            series.append((today_d - timedelta(days=i), round(px, 4)))
        for d, p in series:
            lines.append(f"{d.isoformat()},{a['symbol']},{p}")
    csv_blob = "\n".join(lines)
    imp = check(client.post(
        "/assets/prices/import",
        files={"file": ("prices.csv", csv_blob, "text/csv")},
        headers=oauth,
    ), "bulk price import")
    print(f"  ✓ Price history: {imp.get('success_count', '?')} rows imported, {imp.get('error_count', 0)} errors")

    price_of = {a["symbol"]: a["price"] for a in ASSETS}

    # ── 5. Portfolios ─────────────────────────────────────────────────────────
    print("\n[5/6] Creating portfolios...")
    existing_pf = check(client.get("/portfolios", params={"page_size": 200}, headers=oauth), "list portfolios")
    pf_by_name = {p["name"]: p for p in existing_pf}
    portfolios: list[dict] = []

    for p in PORTFOLIOS:
        if p["name"] in pf_by_name:
            pf = pf_by_name[p["name"]]
        else:
            pf = check(client.post("/portfolios", json={
                "name": p["name"], "description": p["description"], "base_currency": "USD",
            }, headers=oauth), f"create portfolio {p['name']}")
        portfolios.append({**p, "id": pf["id"]})
    print(f"  ✓ {len(portfolios)} portfolios ready")

    # ── 6. Transactions (holdings auto-derive from BUY/SELL) ──────────────────
    print("\n[6/6] Creating transactions...")
    today = date.today()
    tx_count = 0

    for pf in portfolios:
        for symbol in pf["symbols"]:
            base = price_of[symbol]
            # 2–4 buys spread over the last year
            for _ in range(random.randint(2, 4)):
                days_ago = random.randint(30, 360)
                trade_date = today - timedelta(days=days_ago)
                # Historical price wobble around current
                px = round(base * random.uniform(0.72, 1.02), 2)
                if base > 10000:      qty = round(random.uniform(0.05, 0.6), 4)
                elif base > 400:      qty = round(random.uniform(3, 25), 2)
                elif base > 100:      qty = round(random.uniform(15, 120), 2)
                else:                 qty = round(random.uniform(50, 400), 2)

                gross = round(qty * px, 2)
                fees = round(gross * 0.001, 2)
                client.post("/transactions", json={
                    "portfolio_id": pf["id"], "asset_id": asset_ids[symbol],
                    "transaction_type": "BUY", "trade_date": trade_date.isoformat(),
                    "quantity": qty, "price": px,
                    "gross_amount": gross, "fees": fees, "net_amount": round(gross + fees, 2),
                    "currency": "USD", "notes": f"Buy {symbol}",
                }, headers=oauth)
                tx_count += 1

            # Occasional dividend for equities/ETFs
            if random.random() < 0.4 and base < 10000:
                trade_date = today - timedelta(days=random.randint(1, 90))
                client.post("/transactions", json={
                    "portfolio_id": pf["id"], "asset_id": asset_ids[symbol],
                    "transaction_type": "DIVIDEND", "trade_date": trade_date.isoformat(),
                    "gross_amount": round(base * 0.004, 2), "net_amount": round(base * 0.004, 2),
                    "currency": "USD", "notes": f"Dividend {symbol}",
                }, headers=oauth)
                tx_count += 1

    print(f"  ✓ {tx_count} transactions created (holdings auto-derived)")

    print("\n" + "=" * 56)
    print("  Seed complete!")
    print("=" * 56)
    print(f"\n  Log in at  http://localhost:3000")
    print(f"  Email:     {DEMO_EMAIL}")
    print(f"  Password:  {DEMO_PASSWORD}")
    print(f"\n  {len(asset_ids)} assets · {len(portfolios)} portfolios · {tx_count} transactions")
    print("  Note: use the email/password form — NOT 'Continue as Demo'")
    print("        (the demo button is offline-only and shows no seeded data).\n")

    client.close()


if __name__ == "__main__":
    main()
