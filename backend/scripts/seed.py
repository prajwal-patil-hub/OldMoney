"""
Seed OldMoney database with realistic synthetic data.

Creates:
  - 3 organizations (family office, advisory firm, capital group)
  - 10 users spread across orgs with different roles
  - 10 portfolios with realistic mandates
  - ~30 accounts (brokerage, IRA, trust, etc.)
  - ~500 holdings across all portfolios
  - ~10,000 transactions spanning 2 years of history
  - 2 years of daily price history for the full asset universe

Usage:
    cd backend
    python scripts/seed.py

Default login credentials (all accounts):
    Password: Password123!
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import random
import sys
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Path setup — allow running from repo root or backend/
# ---------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# ---------------------------------------------------------------------------
# Try to import app modules; gracefully degrade if not installed
# ---------------------------------------------------------------------------
try:
    from app.database import AsyncSessionLocal, engine, Base  # type: ignore[import]
    from app import models  # type: ignore[import]
    USE_ORM = True
except ImportError:
    USE_ORM = False
    print("[seed] App modules not importable — falling back to raw SQLite mode.")

import argparse
import json
import sqlite3
from contextlib import contextmanager

try:
    from argon2 import PasswordHasher  # type: ignore[import]
    ph = PasswordHasher()
    def hash_password(plain: str) -> str:
        return ph.hash(plain)
except ImportError:
    import hashlib
    def hash_password(plain: str) -> str:  # type: ignore[misc]
        """Fallback SHA-256 hash when argon2-cffi is not installed."""
        return "sha256:" + hashlib.sha256(plain.encode()).hexdigest()


# ===========================================================================
# Constants & reference data
# ===========================================================================

DEFAULT_PASSWORD = "Password123!"
SEED_START_DATE = date.today() - timedelta(days=730)  # 2 years ago
SEED_END_DATE = date.today() - timedelta(days=1)

random.seed(42)  # Deterministic seed for reproducibility

# ---------------------------------------------------------------------------
# Asset universe
# ---------------------------------------------------------------------------
ASSETS: list[dict[str, Any]] = [
    # ── Mega-cap equities ────────────────────────────────────────────────────
    {"symbol": "AAPL",  "name": "Apple Inc.",                 "type": "EQUITY", "sector": "Technology",             "base_price": 185.00, "volatility": 0.018},
    {"symbol": "MSFT",  "name": "Microsoft Corp.",            "type": "EQUITY", "sector": "Technology",             "base_price": 375.00, "volatility": 0.016},
    {"symbol": "GOOGL", "name": "Alphabet Inc.",              "type": "EQUITY", "sector": "Technology",             "base_price": 140.00, "volatility": 0.019},
    {"symbol": "AMZN",  "name": "Amazon.com Inc.",            "type": "EQUITY", "sector": "Consumer Discretionary", "base_price": 175.00, "volatility": 0.021},
    {"symbol": "NVDA",  "name": "NVIDIA Corp.",               "type": "EQUITY", "sector": "Technology",             "base_price": 490.00, "volatility": 0.030},
    {"symbol": "META",  "name": "Meta Platforms Inc.",        "type": "EQUITY", "sector": "Communication Services", "base_price": 350.00, "volatility": 0.025},
    {"symbol": "TSLA",  "name": "Tesla Inc.",                 "type": "EQUITY", "sector": "Consumer Discretionary", "base_price": 245.00, "volatility": 0.040},
    {"symbol": "BRK.B", "name": "Berkshire Hathaway B",       "type": "EQUITY", "sector": "Financials",             "base_price": 360.00, "volatility": 0.012},
    {"symbol": "JPM",   "name": "JPMorgan Chase & Co.",       "type": "EQUITY", "sector": "Financials",             "base_price": 195.00, "volatility": 0.017},
    {"symbol": "V",     "name": "Visa Inc.",                  "type": "EQUITY", "sector": "Financials",             "base_price": 255.00, "volatility": 0.014},
    # ── Large-cap equities ───────────────────────────────────────────────────
    {"symbol": "JNJ",   "name": "Johnson & Johnson",          "type": "EQUITY", "sector": "Healthcare",             "base_price": 155.00, "volatility": 0.012},
    {"symbol": "UNH",   "name": "UnitedHealth Group",         "type": "EQUITY", "sector": "Healthcare",             "base_price": 530.00, "volatility": 0.016},
    {"symbol": "PG",    "name": "Procter & Gamble Co.",       "type": "EQUITY", "sector": "Consumer Staples",       "base_price": 150.00, "volatility": 0.011},
    {"symbol": "KO",    "name": "Coca-Cola Co.",              "type": "EQUITY", "sector": "Consumer Staples",       "base_price": 61.00,  "volatility": 0.010},
    {"symbol": "PEP",   "name": "PepsiCo Inc.",               "type": "EQUITY", "sector": "Consumer Staples",       "base_price": 175.00, "volatility": 0.010},
    {"symbol": "WMT",   "name": "Walmart Inc.",               "type": "EQUITY", "sector": "Consumer Staples",       "base_price": 165.00, "volatility": 0.012},
    {"symbol": "HD",    "name": "Home Depot Inc.",            "type": "EQUITY", "sector": "Consumer Discretionary", "base_price": 355.00, "volatility": 0.016},
    {"symbol": "MCD",   "name": "McDonald's Corp.",           "type": "EQUITY", "sector": "Consumer Discretionary", "base_price": 290.00, "volatility": 0.013},
    {"symbol": "DIS",   "name": "Walt Disney Co.",            "type": "EQUITY", "sector": "Communication Services", "base_price": 95.00,  "volatility": 0.020},
    {"symbol": "NFLX",  "name": "Netflix Inc.",               "type": "EQUITY", "sector": "Communication Services", "base_price": 485.00, "volatility": 0.028},
    {"symbol": "BAC",   "name": "Bank of America Corp.",      "type": "EQUITY", "sector": "Financials",             "base_price": 33.00,  "volatility": 0.020},
    {"symbol": "GS",    "name": "Goldman Sachs Group",        "type": "EQUITY", "sector": "Financials",             "base_price": 415.00, "volatility": 0.018},
    {"symbol": "XOM",   "name": "Exxon Mobil Corp.",          "type": "EQUITY", "sector": "Energy",                 "base_price": 110.00, "volatility": 0.018},
    {"symbol": "CVX",   "name": "Chevron Corp.",              "type": "EQUITY", "sector": "Energy",                 "base_price": 155.00, "volatility": 0.017},
    {"symbol": "NEE",   "name": "NextEra Energy Inc.",        "type": "EQUITY", "sector": "Utilities",              "base_price": 60.00,  "volatility": 0.014},
    {"symbol": "LIN",   "name": "Linde plc",                  "type": "EQUITY", "sector": "Materials",              "base_price": 430.00, "volatility": 0.013},
    {"symbol": "CAT",   "name": "Caterpillar Inc.",           "type": "EQUITY", "sector": "Industrials",            "base_price": 275.00, "volatility": 0.018},
    {"symbol": "RTX",   "name": "Raytheon Technologies",      "type": "EQUITY", "sector": "Industrials",            "base_price": 90.00,  "volatility": 0.015},
    {"symbol": "NOW",   "name": "ServiceNow Inc.",            "type": "EQUITY", "sector": "Technology",             "base_price": 680.00, "volatility": 0.022},
    {"symbol": "ADBE",  "name": "Adobe Inc.",                 "type": "EQUITY", "sector": "Technology",             "base_price": 520.00, "volatility": 0.020},
    # ── ETFs ─────────────────────────────────────────────────────────────────
    {"symbol": "SPY",   "name": "SPDR S&P 500 ETF Trust",    "type": "ETF",    "sector": "Broad Market",           "base_price": 470.00, "volatility": 0.012},
    {"symbol": "QQQ",   "name": "Invesco QQQ Trust",          "type": "ETF",    "sector": "Technology",             "base_price": 390.00, "volatility": 0.016},
    {"symbol": "VTI",   "name": "Vanguard Total Market ETF",  "type": "ETF",    "sector": "Broad Market",           "base_price": 235.00, "volatility": 0.012},
    {"symbol": "IWM",   "name": "iShares Russell 2000 ETF",   "type": "ETF",    "sector": "Small Cap",              "base_price": 195.00, "volatility": 0.018},
    {"symbol": "AGG",   "name": "iShares Core US Agg Bond",   "type": "ETF",    "sector": "Fixed Income",           "base_price": 95.00,  "volatility": 0.006},
    {"symbol": "GLD",   "name": "SPDR Gold Shares",           "type": "ETF",    "sector": "Commodities",            "base_price": 185.00, "volatility": 0.011},
    {"symbol": "VNQ",   "name": "Vanguard Real Estate ETF",   "type": "ETF",    "sector": "Real Estate",            "base_price": 82.00,  "volatility": 0.015},
    {"symbol": "EFA",   "name": "iShares MSCI EAFE ETF",      "type": "ETF",    "sector": "International",          "base_price": 74.00,  "volatility": 0.013},
    # ── Fixed income ─────────────────────────────────────────────────────────
    {"symbol": "US10Y", "name": "US 10-Year Treasury Note",   "type": "BOND",   "sector": "Government",             "base_price": 97.50,  "volatility": 0.005},
    {"symbol": "US2Y",  "name": "US 2-Year Treasury Note",    "type": "BOND",   "sector": "Government",             "base_price": 99.20,  "volatility": 0.003},
    {"symbol": "TIPS",  "name": "iShares TIPS Bond ETF",      "type": "BOND",   "sector": "Inflation-Linked",       "base_price": 108.00, "volatility": 0.005},
    # ── Crypto ───────────────────────────────────────────────────────────────
    {"symbol": "BTC",   "name": "Bitcoin",                    "type": "CRYPTO", "sector": "Cryptocurrency",         "base_price": 42000.00, "volatility": 0.040},
    {"symbol": "ETH",   "name": "Ethereum",                   "type": "CRYPTO", "sector": "Cryptocurrency",         "base_price": 2500.00,  "volatility": 0.045},
    {"symbol": "SOL",   "name": "Solana",                     "type": "CRYPTO", "sector": "Cryptocurrency",         "base_price": 95.00,    "volatility": 0.055},
    # ── Cash ─────────────────────────────────────────────────────────────────
    {"symbol": "USD",   "name": "US Dollar Cash",             "type": "CASH",   "sector": "Cash",                   "base_price": 1.00,   "volatility": 0.0},
]

# ---------------------------------------------------------------------------
# Organizations
# ---------------------------------------------------------------------------
ORGS: list[dict[str, Any]] = [
    {
        "name": "Pemberton Capital",
        "slug": "pemberton-capital",
        "description": "Multi-generational family office established 1987. "
                       "Growth-oriented with alternatives exposure.",
        "aum_usd": 125_000_000,
    },
    {
        "name": "Ashworth Family Office",
        "slug": "ashworth-fo",
        "description": "Single-family office. Conservative wealth preservation mandate. "
                       "60/40 core with real assets overlay.",
        "aum_usd": 280_000_000,
    },
    {
        "name": "Meridian Advisors",
        "slug": "meridian-advisors",
        "description": "Independent RIA serving UHNW clients. "
                       "ESG-focused equity strategies.",
        "aum_usd": 890_000_000,
    },
]

# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
USERS: list[dict[str, Any]] = [
    # Pemberton Capital
    {"email": "admin@pemberton.com",   "full_name": "Charles Pemberton III", "role": "OWNER",   "org_slug": "pemberton-capital"},
    {"email": "emily@pemberton.com",   "full_name": "Emily Hartwell",         "role": "ANALYST", "org_slug": "pemberton-capital"},
    {"email": "thomas@pemberton.com",  "full_name": "Thomas Wren",            "role": "VIEWER",  "org_slug": "pemberton-capital"},
    # Ashworth Family Office
    {"email": "admin@ashworth.com",    "full_name": "Margaret Ashworth",      "role": "OWNER",   "org_slug": "ashworth-fo"},
    {"email": "james@ashworth.com",    "full_name": "James Fordham",          "role": "ADMIN",   "org_slug": "ashworth-fo"},
    {"email": "claire@ashworth.com",   "full_name": "Claire Alderton",        "role": "ANALYST", "org_slug": "ashworth-fo"},
    # Meridian Advisors
    {"email": "admin@meridian.com",    "full_name": "Robert Sinclair",        "role": "OWNER",   "org_slug": "meridian-advisors"},
    {"email": "diana@meridian.com",    "full_name": "Diana Thorne",           "role": "ADMIN",   "org_slug": "meridian-advisors"},
    {"email": "marcus@meridian.com",   "full_name": "Marcus Webb",            "role": "ANALYST", "org_slug": "meridian-advisors"},
    {"email": "alice@meridian.com",    "full_name": "Alice Pemberton",        "role": "VIEWER",  "org_slug": "meridian-advisors"},
]

# ---------------------------------------------------------------------------
# Portfolio templates (per org)
# ---------------------------------------------------------------------------
PORTFOLIO_TEMPLATES: list[dict[str, Any]] = [
    # Pemberton Capital
    {"name": "Pemberton Growth Fund",      "org_slug": "pemberton-capital", "currency": "USD",
     "mandate": "Long-only US equity growth. Benchmark: S&P 500.",
     "bias": {"EQUITY": 0.80, "ETF": 0.10, "CRYPTO": 0.05, "CASH": 0.05}},
    {"name": "Pemberton Alternatives",     "org_slug": "pemberton-capital", "currency": "USD",
     "mandate": "Alternatives sleeve: crypto, gold, REITs.",
     "bias": {"CRYPTO": 0.35, "ETF": 0.45, "BOND": 0.10, "CASH": 0.10}},
    {"name": "Pemberton Tax-Exempt",       "org_slug": "pemberton-capital", "currency": "USD",
     "mandate": "IRA accounts. Similar to growth but no tax-loss harvesting.",
     "bias": {"EQUITY": 0.75, "ETF": 0.20, "CASH": 0.05}},
    # Ashworth Family Office
    {"name": "Ashworth Core 60/40",        "org_slug": "ashworth-fo",       "currency": "USD",
     "mandate": "60% equity / 40% fixed income. Capital preservation primary.",
     "bias": {"EQUITY": 0.45, "ETF": 0.20, "BOND": 0.30, "CASH": 0.05}},
    {"name": "Ashworth Real Assets",       "org_slug": "ashworth-fo",       "currency": "USD",
     "mandate": "Inflation hedge: gold, REITs, TIPS, energy.",
     "bias": {"ETF": 0.55, "BOND": 0.25, "EQUITY": 0.15, "CASH": 0.05}},
    {"name": "Ashworth Next-Gen Trust",    "org_slug": "ashworth-fo",       "currency": "USD",
     "mandate": "30-year horizon. Aggressive growth for beneficiaries.",
     "bias": {"EQUITY": 0.85, "ETF": 0.10, "CASH": 0.05}},
    {"name": "Ashworth Fixed Income",      "org_slug": "ashworth-fo",       "currency": "USD",
     "mandate": "Pure fixed income for liquidity reserve.",
     "bias": {"BOND": 0.70, "ETF": 0.20, "CASH": 0.10}},
    # Meridian Advisors
    {"name": "Meridian ESG Select",        "org_slug": "meridian-advisors", "currency": "USD",
     "mandate": "ESG-screened large-cap US equity. Low fossil fuel exposure.",
     "bias": {"EQUITY": 0.80, "ETF": 0.15, "CASH": 0.05}},
    {"name": "Meridian Global Balanced",   "org_slug": "meridian-advisors", "currency": "USD",
     "mandate": "Global multi-asset. 50% US equity, 20% international, 30% bonds.",
     "bias": {"EQUITY": 0.50, "ETF": 0.30, "BOND": 0.15, "CASH": 0.05}},
    {"name": "Meridian Income Strategy",   "org_slug": "meridian-advisors", "currency": "USD",
     "mandate": "High-dividend equity + investment-grade bonds for income generation.",
     "bias": {"EQUITY": 0.40, "ETF": 0.25, "BOND": 0.30, "CASH": 0.05}},
]

# ---------------------------------------------------------------------------
# Account type templates
# ---------------------------------------------------------------------------
ACCOUNT_TYPES = [
    "Individual Brokerage",
    "Joint Brokerage",
    "Traditional IRA",
    "Roth IRA",
    "Trust Account",
    "Corporate Account",
    "Pension Account",
    "Custodial Account",
]

# ---------------------------------------------------------------------------
# Transaction types
# ---------------------------------------------------------------------------
TX_TYPES = ["BUY", "SELL", "DIVIDEND", "INTEREST", "FEE", "DEPOSIT", "WITHDRAWAL"]


# ===========================================================================
# Price generation — geometric Brownian motion
# ===========================================================================

def generate_price_series(
    base_price: float,
    volatility: float,
    start: date,
    end: date,
) -> list[tuple[date, float]]:
    """
    Generate a realistic daily price series using geometric Brownian motion.

    Annual drift is set per asset type:
    - Equities: +8% to +15% annual
    - ETFs:     +7% to +12% annual
    - Bonds:    +1% to +3% annual
    - Crypto:   -20% to +80% annual (wide range)
    - Cash:     0%
    """
    prices: list[tuple[date, float]] = []
    current_price = base_price
    current_date = start

    dt = 1 / 252  # one trading day as fraction of year
    annual_drift = random.uniform(0.06, 0.14)  # 6–14% annual return

    while current_date <= end:
        # Skip weekends for equities/ETFs (crypto trades 24/7 but we simplify)
        if current_date.weekday() < 5:  # Mon–Fri
            prices.append((current_date, round(current_price, 4)))

            # GBM step: S_{t+1} = S_t * exp((μ - σ²/2)Δt + σ√Δt * Z)
            import math
            z = random.gauss(0, 1)
            log_return = (annual_drift - 0.5 * volatility ** 2) * dt + volatility * math.sqrt(dt) * z
            current_price = current_price * math.exp(log_return)
            current_price = max(current_price, 0.01)  # floor at $0.01

        current_date += timedelta(days=1)

    return prices


# ===========================================================================
# SQLite raw seeder (used when ORM models not available)
# ===========================================================================

def get_db_path() -> str:
    """Resolve database path from environment or default."""
    db_url = os.getenv("DATABASE_URL", "sqlite:///./data/oldmoney.db")
    # Strip SQLAlchemy dialect prefix
    db_url = db_url.replace("sqlite+aiosqlite:///", "").replace("sqlite:///", "")
    # Handle absolute paths (////app/data/...)
    db_url = db_url.lstrip("/")
    if not db_url.startswith("/"):
        db_url = str(BACKEND_DIR.parent / db_url)
    return db_url


@contextmanager
def get_raw_connection():
    """Context manager for raw SQLite connection."""
    db_path = get_db_path()
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def ensure_schema(conn: sqlite3.Connection) -> None:
    """Create minimal schema for standalone seeding."""
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS organizations (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            slug        TEXT NOT NULL UNIQUE,
            description TEXT,
            aum_usd     REAL,
            created_at  TEXT DEFAULT (datetime('now')),
            updated_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS users (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id          INTEGER NOT NULL REFERENCES organizations(id),
            email           TEXT NOT NULL UNIQUE,
            full_name       TEXT NOT NULL,
            hashed_password TEXT NOT NULL,
            role            TEXT NOT NULL DEFAULT 'VIEWER',
            is_active       INTEGER NOT NULL DEFAULT 1,
            created_at      TEXT DEFAULT (datetime('now')),
            updated_at      TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS assets (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol      TEXT NOT NULL UNIQUE,
            name        TEXT NOT NULL,
            asset_type  TEXT NOT NULL,
            sector      TEXT,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS asset_prices (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id    INTEGER NOT NULL REFERENCES assets(id),
            price_date  TEXT NOT NULL,
            close_price REAL NOT NULL,
            UNIQUE(asset_id, price_date)
        );

        CREATE TABLE IF NOT EXISTS portfolios (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id      INTEGER NOT NULL REFERENCES organizations(id),
            name        TEXT NOT NULL,
            currency    TEXT NOT NULL DEFAULT 'USD',
            mandate     TEXT,
            created_at  TEXT DEFAULT (datetime('now')),
            updated_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS accounts (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id         INTEGER NOT NULL REFERENCES organizations(id),
            portfolio_id   INTEGER NOT NULL REFERENCES portfolios(id),
            name           TEXT NOT NULL,
            account_type   TEXT NOT NULL,
            account_number TEXT,
            custodian      TEXT,
            created_at     TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS holdings (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id       INTEGER NOT NULL REFERENCES organizations(id),
            account_id   INTEGER NOT NULL REFERENCES accounts(id),
            asset_id     INTEGER NOT NULL REFERENCES assets(id),
            quantity     REAL NOT NULL DEFAULT 0,
            cost_basis   REAL NOT NULL DEFAULT 0,
            created_at   TEXT DEFAULT (datetime('now')),
            updated_at   TEXT DEFAULT (datetime('now')),
            UNIQUE(account_id, asset_id)
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            org_id         INTEGER NOT NULL REFERENCES organizations(id),
            account_id     INTEGER NOT NULL REFERENCES accounts(id),
            asset_id       INTEGER REFERENCES assets(id),
            tx_type        TEXT NOT NULL,
            quantity       REAL,
            price          REAL,
            amount         REAL NOT NULL,
            fees           REAL DEFAULT 0,
            tx_date        TEXT NOT NULL,
            notes          TEXT,
            created_at     TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_asset_prices_asset_date ON asset_prices(asset_id, price_date);
        CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id, tx_date);
        CREATE INDEX IF NOT EXISTS idx_transactions_org ON transactions(org_id, tx_date);
        CREATE INDEX IF NOT EXISTS idx_holdings_account ON holdings(account_id);
    """)


# ===========================================================================
# Seed logic
# ===========================================================================

def seed_organizations(conn: sqlite3.Connection) -> dict[str, int]:
    """Insert orgs, return slug→id map."""
    org_ids: dict[str, int] = {}
    for org in ORGS:
        existing = conn.execute(
            "SELECT id FROM organizations WHERE slug = ?", (org["slug"],)
        ).fetchone()
        if existing:
            org_ids[org["slug"]] = existing["id"]
            continue
        cursor = conn.execute(
            "INSERT INTO organizations (name, slug, description, aum_usd) VALUES (?, ?, ?, ?)",
            (org["name"], org["slug"], org["description"], org["aum_usd"]),
        )
        org_ids[org["slug"]] = cursor.lastrowid
    return org_ids


def seed_users(conn: sqlite3.Connection, org_ids: dict[str, int]) -> dict[str, int]:
    """Insert users, return email→id map."""
    hashed_pw = hash_password(DEFAULT_PASSWORD)
    user_ids: dict[str, int] = {}
    for user in USERS:
        org_id = org_ids[user["org_slug"]]
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ?", (user["email"],)
        ).fetchone()
        if existing:
            user_ids[user["email"]] = existing["id"]
            continue
        cursor = conn.execute(
            "INSERT INTO users (org_id, email, full_name, hashed_password, role) VALUES (?, ?, ?, ?, ?)",
            (org_id, user["email"], user["full_name"], hashed_pw, user["role"]),
        )
        user_ids[user["email"]] = cursor.lastrowid
    return user_ids


def seed_assets(conn: sqlite3.Connection) -> dict[str, int]:
    """Insert assets, return symbol→id map."""
    asset_ids: dict[str, int] = {}
    for asset in ASSETS:
        existing = conn.execute(
            "SELECT id FROM assets WHERE symbol = ?", (asset["symbol"],)
        ).fetchone()
        if existing:
            asset_ids[asset["symbol"]] = existing["id"]
            continue
        cursor = conn.execute(
            "INSERT INTO assets (symbol, name, asset_type, sector) VALUES (?, ?, ?, ?)",
            (asset["symbol"], asset["name"], asset["type"], asset["sector"]),
        )
        asset_ids[asset["symbol"]] = cursor.lastrowid
    return asset_ids


def seed_prices(conn: sqlite3.Connection, asset_ids: dict[str, int]) -> dict[str, dict[str, float]]:
    """
    Generate 2 years of daily prices for all assets.
    Returns symbol → {date_str → price} for use in transaction seeding.
    """
    print(f"  Generating price history for {len(ASSETS)} assets over 2 years...")
    price_cache: dict[str, dict[str, float]] = {}
    batch: list[tuple] = []

    for asset in ASSETS:
        symbol = asset["symbol"]
        asset_id = asset_ids[symbol]

        series = generate_price_series(
            base_price=asset["base_price"],
            volatility=asset["volatility"],
            start=SEED_START_DATE,
            end=SEED_END_DATE,
        )

        price_cache[symbol] = {}
        for price_date, price in series:
            date_str = price_date.isoformat()
            price_cache[symbol][date_str] = price
            batch.append((asset_id, date_str, price))

    # Bulk insert with IGNORE for idempotency
    conn.executemany(
        "INSERT OR IGNORE INTO asset_prices (asset_id, price_date, close_price) VALUES (?, ?, ?)",
        batch,
    )
    total_prices = len(batch)
    print(f"  Inserted {total_prices:,} price records.")
    return price_cache


def seed_portfolios(conn: sqlite3.Connection, org_ids: dict[str, int]) -> dict[str, int]:
    """Insert portfolios, return name→id map."""
    portfolio_ids: dict[str, int] = {}
    for tmpl in PORTFOLIO_TEMPLATES:
        org_id = org_ids[tmpl["org_slug"]]
        existing = conn.execute(
            "SELECT id FROM portfolios WHERE name = ? AND org_id = ?",
            (tmpl["name"], org_id),
        ).fetchone()
        if existing:
            portfolio_ids[tmpl["name"]] = existing["id"]
            continue
        cursor = conn.execute(
            "INSERT INTO portfolios (org_id, name, currency, mandate) VALUES (?, ?, ?, ?)",
            (org_id, tmpl["name"], tmpl["currency"], tmpl["mandate"]),
        )
        portfolio_ids[tmpl["name"]] = cursor.lastrowid
    return portfolio_ids


def seed_accounts(
    conn: sqlite3.Connection,
    org_ids: dict[str, int],
    portfolio_ids: dict[str, int],
) -> list[dict[str, Any]]:
    """Create 2–4 accounts per portfolio. Return list of account dicts."""
    custodians = ["Fidelity", "Schwab", "Interactive Brokers", "TD Ameritrade", "Merrill Lynch", "Vanguard"]
    accounts: list[dict[str, Any]] = []

    for tmpl in PORTFOLIO_TEMPLATES:
        portfolio_id = portfolio_ids[tmpl["name"]]
        org_id = org_ids[tmpl["org_slug"]]
        num_accounts = random.randint(2, 4)

        for i in range(num_accounts):
            account_type = random.choice(ACCOUNT_TYPES)
            custodian = random.choice(custodians)
            acct_num = f"{random.randint(100, 999)}-{random.randint(10000, 99999)}"
            name = f"{tmpl['name']} — {account_type}"

            existing = conn.execute(
                "SELECT id FROM accounts WHERE name = ? AND portfolio_id = ?",
                (name, portfolio_id),
            ).fetchone()
            if existing:
                accounts.append({
                    "id": existing["id"],
                    "org_id": org_id,
                    "portfolio_id": portfolio_id,
                    "bias": tmpl["bias"],
                })
                continue

            cursor = conn.execute(
                "INSERT INTO accounts (org_id, portfolio_id, name, account_type, account_number, custodian) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (org_id, portfolio_id, name, account_type, acct_num, custodian),
            )
            accounts.append({
                "id": cursor.lastrowid,
                "org_id": org_id,
                "portfolio_id": portfolio_id,
                "bias": tmpl["bias"],
            })

    print(f"  Created {len(accounts)} accounts across {len(PORTFOLIO_TEMPLATES)} portfolios.")
    return accounts


def pick_assets_for_account(bias: dict[str, float], count: int = 15) -> list[dict[str, Any]]:
    """
    Select assets weighted by the portfolio's type bias.
    Returns a list of asset dicts.
    """
    weighted: list[tuple[float, dict]] = []
    for asset in ASSETS:
        weight = bias.get(asset["type"], 0.02)
        weighted.append((weight, asset))

    total = sum(w for w, _ in weighted)
    probs = [w / total for w, _ in weighted]
    asset_list = [a for _, a in weighted]

    chosen_indices = set()
    result = []
    attempts = 0
    while len(result) < count and attempts < count * 10:
        idx = random.choices(range(len(asset_list)), weights=probs, k=1)[0]
        if idx not in chosen_indices:
            chosen_indices.add(idx)
            result.append(asset_list[idx])
        attempts += 1

    return result


def get_price_on_date(
    price_cache: dict[str, dict[str, float]],
    symbol: str,
    target_date: date,
) -> float:
    """Get the price on or before target_date (walk back up to 5 days)."""
    prices = price_cache.get(symbol, {})
    for offset in range(6):
        d = target_date - timedelta(days=offset)
        price = prices.get(d.isoformat())
        if price is not None:
            return price
    return ASSETS[next(i for i, a in enumerate(ASSETS) if a["symbol"] == symbol)]["base_price"]


def seed_holdings_and_transactions(
    conn: sqlite3.Connection,
    accounts: list[dict[str, Any]],
    asset_ids: dict[str, int],
    price_cache: dict[str, dict[str, float]],
    target_transactions: int = 10_000,
) -> None:
    """
    Generate holdings and transaction history.

    Strategy:
    1. For each account, pick 10–20 assets based on portfolio bias.
    2. Simulate 2 years of BUY/SELL/DIVIDEND activity.
    3. Compute final holdings from net quantity.
    4. Insert transactions and holdings.
    """
    all_dates = sorted(price_cache.get("SPY", {}).keys())
    if not all_dates:
        print("  WARNING: No price data found. Skipping holdings/transactions.")
        return

    transactions_batch: list[tuple] = []
    holdings_map: dict[tuple[int, int], dict] = {}  # (account_id, asset_id) → holding

    tx_per_account = max(10, target_transactions // len(accounts))

    for account in accounts:
        account_id = account["id"]
        org_id = account["org_id"]
        bias = account["bias"]

        selected_assets = pick_assets_for_account(bias, count=random.randint(10, 20))

        # Track running quantities for this account
        quantities: dict[str, float] = {a["symbol"]: 0.0 for a in selected_assets}
        cost_bases: dict[str, float] = {a["symbol"]: 0.0 for a in selected_assets}

        # Initial purchase cluster (first 30 days of history)
        initial_dates = all_dates[:30]
        for asset in selected_assets:
            symbol = asset["symbol"]
            asset_id = asset_ids[symbol]

            # Make 1–3 initial buys
            for _ in range(random.randint(1, 3)):
                tx_date_str = random.choice(initial_dates)
                tx_date = date.fromisoformat(tx_date_str)
                price = get_price_on_date(price_cache, symbol, tx_date)

                # Quantity calibrated to realistic position sizes
                if asset["type"] == "CRYPTO":
                    qty = round(random.uniform(0.05, 5.0), 6)
                elif price > 1000:
                    qty = round(random.uniform(1, 20), 4)
                elif price > 100:
                    qty = round(random.uniform(5, 100), 4)
                else:
                    qty = round(random.uniform(10, 500), 4)

                amount = round(qty * price, 2)
                fees = round(amount * random.uniform(0.0005, 0.002), 2)

                quantities[symbol] = round(quantities[symbol] + qty, 8)
                cost_bases[symbol] = round(cost_bases[symbol] + amount + fees, 2)

                transactions_batch.append((
                    org_id, account_id, asset_id, "BUY",
                    qty, price, amount, fees, tx_date_str,
                    f"Initial position — {asset['name']}"
                ))

        # Ongoing activity (rest of history)
        ongoing_dates = all_dates[30:]
        num_ongoing = min(tx_per_account, len(ongoing_dates) * 2)

        for _ in range(num_ongoing):
            tx_date_str = random.choice(ongoing_dates)
            tx_date = date.fromisoformat(tx_date_str)
            asset = random.choice(selected_assets)
            symbol = asset["symbol"]
            asset_id = asset_ids[symbol]
            price = get_price_on_date(price_cache, symbol, tx_date)

            # Weighted tx type distribution
            if asset["type"] in ("EQUITY", "ETF") and random.random() < 0.12:
                # Dividend
                div_per_share = round(price * random.uniform(0.003, 0.008), 4)
                qty = quantities[symbol]
                if qty <= 0:
                    continue
                amount = round(qty * div_per_share, 2)
                transactions_batch.append((
                    org_id, account_id, asset_id, "DIVIDEND",
                    None, div_per_share, amount, 0.0, tx_date_str,
                    f"Quarterly dividend — {asset['name']}"
                ))

            elif quantities[symbol] > 0 and random.random() < 0.25:
                # Partial sell (never sell more than 50% of position)
                max_sell_qty = quantities[symbol] * 0.50
                if asset["type"] == "CRYPTO":
                    qty = round(random.uniform(0.01, min(max_sell_qty, 1.0)), 6)
                elif price > 100:
                    qty = round(random.uniform(1, max(1, int(max_sell_qty))), 4)
                else:
                    qty = round(random.uniform(1, max(1, int(max_sell_qty))), 4)

                qty = min(qty, quantities[symbol])
                if qty <= 0:
                    continue

                amount = round(qty * price, 2)
                fees = round(amount * random.uniform(0.0005, 0.002), 2)

                quantities[symbol] = round(quantities[symbol] - qty, 8)
                avg_cost = cost_bases[symbol] / max(quantities[symbol] + qty, 0.0001)
                cost_bases[symbol] = round(cost_bases[symbol] - avg_cost * qty, 2)
                cost_bases[symbol] = max(cost_bases[symbol], 0)

                transactions_batch.append((
                    org_id, account_id, asset_id, "SELL",
                    qty, price, amount, fees, tx_date_str,
                    f"Portfolio rebalance — {asset['name']}"
                ))

            else:
                # Buy
                if asset["type"] == "CRYPTO":
                    qty = round(random.uniform(0.01, 0.5), 6)
                elif price > 500:
                    qty = round(random.uniform(1, 10), 4)
                elif price > 100:
                    qty = round(random.uniform(2, 50), 4)
                else:
                    qty = round(random.uniform(5, 200), 4)

                amount = round(qty * price, 2)
                fees = round(amount * random.uniform(0.0005, 0.002), 2)

                quantities[symbol] = round(quantities[symbol] + qty, 8)
                cost_bases[symbol] = round(cost_bases[symbol] + amount + fees, 2)

                transactions_batch.append((
                    org_id, account_id, asset_id, "BUY",
                    qty, price, amount, fees, tx_date_str,
                    f"Add to position — {asset['name']}"
                ))

        # Build holdings from final quantities
        for asset in selected_assets:
            symbol = asset["symbol"]
            qty = quantities[symbol]
            if qty <= 0.0001:
                continue
            asset_id = asset_ids[symbol]
            key = (account_id, asset_id)
            holdings_map[key] = {
                "org_id": org_id,
                "account_id": account_id,
                "asset_id": asset_id,
                "quantity": qty,
                "cost_basis": cost_bases[symbol],
            }

    # Bulk insert transactions
    print(f"  Inserting {len(transactions_batch):,} transactions...")
    conn.executemany(
        "INSERT OR IGNORE INTO transactions "
        "(org_id, account_id, asset_id, tx_type, quantity, price, amount, fees, tx_date, notes) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        transactions_batch,
    )

    # Bulk insert holdings
    holdings_batch = [
        (h["org_id"], h["account_id"], h["asset_id"], h["quantity"], h["cost_basis"])
        for h in holdings_map.values()
    ]
    print(f"  Inserting {len(holdings_batch):,} holdings...")
    conn.executemany(
        "INSERT OR REPLACE INTO holdings (org_id, account_id, asset_id, quantity, cost_basis) "
        "VALUES (?, ?, ?, ?, ?)",
        holdings_batch,
    )


# ===========================================================================
# Entry point
# ===========================================================================

def main(reset: bool = False) -> None:
    print("\n" + "=" * 60)
    print("  OldMoney Database Seeder")
    print("=" * 60)

    with get_raw_connection() as conn:
        print("\n[1/7] Ensuring schema...")
        ensure_schema(conn)

        if reset:
            print("  Resetting data (--reset flag)...")
            for table in ["transactions", "holdings", "accounts", "portfolios",
                          "asset_prices", "assets", "users", "organizations"]:
                conn.execute(f"DELETE FROM {table}")
            print("  Tables cleared.")

        print("\n[2/7] Seeding organizations...")
        org_ids = seed_organizations(conn)
        print(f"  {len(org_ids)} organizations ready.")

        print("\n[3/7] Seeding users...")
        user_ids = seed_users(conn, org_ids)
        print(f"  {len(user_ids)} users ready.")

        print("\n[4/7] Seeding asset universe...")
        asset_ids = seed_assets(conn)
        print(f"  {len(asset_ids)} assets ready.")

        print("\n[5/7] Generating price history (2 years)...")
        price_cache = seed_prices(conn, asset_ids)

        print("\n[6/7] Seeding portfolios & accounts...")
        portfolio_ids = seed_portfolios(conn, org_ids)
        accounts = seed_accounts(conn, org_ids, portfolio_ids)

        print("\n[7/7] Seeding holdings & transactions (~10,000 tx)...")
        seed_holdings_and_transactions(conn, accounts, asset_ids, price_cache, target_transactions=10_000)

    print("\n" + "=" * 60)
    print("  Seed complete!")
    print("=" * 60)
    print(f"\n  Organizations : {len(ORGS)}")
    print(f"  Users         : {len(USERS)}")
    print(f"  Assets        : {len(ASSETS)}")
    print(f"  Portfolios    : {len(PORTFOLIO_TEMPLATES)}")
    print(f"\n  Default login : admin@pemberton.com")
    print(f"  Password      : {DEFAULT_PASSWORD}")
    print(f"\n  API docs      : http://localhost:8000/docs")
    print(f"  App           : http://localhost:3000")
    print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed OldMoney database with synthetic data.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Clear all existing data before seeding (DESTRUCTIVE).",
    )
    args = parser.parse_args()
    main(reset=args.reset)
