"""Add performance and security indexes

Revision ID: 0002
Revises: 0001
Create Date: 2025-01-15 00:00:00.000000

These indexes are critical for:
1. Tenant isolation query performance (every query filters by org_id)
2. Soft-delete filtering (deleted_at IS NULL on every query)
3. Token lookup performance (auth hot path)
"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Tenant isolation indexes (org_id on every tenant-scoped table) ──
    op.create_index("ix_portfolios_org_id", "portfolios", ["org_id"], if_not_exists=True)
    op.create_index("ix_portfolios_deleted_at", "portfolios", ["deleted_at"], if_not_exists=True)
    op.create_index("ix_accounts_org_id", "accounts", ["org_id"], if_not_exists=True)
    op.create_index("ix_accounts_portfolio_id", "accounts", ["portfolio_id"], if_not_exists=True)
    op.create_index("ix_assets_org_id", "assets", ["org_id"], if_not_exists=True)
    op.create_index("ix_assets_symbol", "assets", ["symbol"], if_not_exists=True)
    op.create_index("ix_holdings_org_id", "holdings", ["org_id"], if_not_exists=True)
    op.create_index("ix_holdings_portfolio_id", "holdings", ["portfolio_id"], if_not_exists=True)
    op.create_index("ix_holdings_asset_id", "holdings", ["asset_id"], if_not_exists=True)
    op.create_index("ix_holdings_as_of_date", "holdings", ["as_of_date"], if_not_exists=True)
    op.create_index("ix_transactions_org_id", "transactions", ["org_id"], if_not_exists=True)
    op.create_index("ix_transactions_portfolio_id", "transactions", ["portfolio_id"], if_not_exists=True)
    op.create_index("ix_transactions_trade_date", "transactions", ["trade_date"], if_not_exists=True)
    op.create_index("ix_transactions_external_id", "transactions", ["external_id"], if_not_exists=True)
    op.create_index("ix_asset_prices_asset_id_date", "asset_prices", ["asset_id", "price_date"], if_not_exists=True)
    op.create_index("ix_memberships_org_id", "memberships", ["org_id"], if_not_exists=True)
    op.create_index("ix_memberships_user_id", "memberships", ["user_id"], if_not_exists=True)
    op.create_index("ix_ai_conversations_org_id_user_id", "ai_conversations", ["org_id", "user_id"], if_not_exists=True)
    op.create_index("ix_ai_messages_conversation_id", "ai_messages", ["conversation_id"], if_not_exists=True)
    op.create_index("ix_audit_logs_org_id", "audit_logs", ["org_id"], if_not_exists=True)
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"], if_not_exists=True)
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"], if_not_exists=True)

    # ── Soft-delete compound indexes ──
    op.create_index("ix_portfolios_org_deleted", "portfolios", ["org_id", "deleted_at"], if_not_exists=True)
    op.create_index("ix_holdings_org_deleted", "holdings", ["org_id", "deleted_at"], if_not_exists=True)
    op.create_index("ix_transactions_org_deleted", "transactions", ["org_id", "deleted_at"], if_not_exists=True)

    # ── Auth hot path ──
    # refresh_tokens token_hash already indexed from migration 0001
    # users email already indexed from migration 0001


def downgrade() -> None:
    op.drop_index("ix_portfolios_org_id", "portfolios")
    op.drop_index("ix_portfolios_deleted_at", "portfolios")
    op.drop_index("ix_accounts_org_id", "accounts")
    op.drop_index("ix_accounts_portfolio_id", "accounts")
    op.drop_index("ix_assets_org_id", "assets")
    op.drop_index("ix_assets_symbol", "assets")
    op.drop_index("ix_holdings_org_id", "holdings")
    op.drop_index("ix_holdings_portfolio_id", "holdings")
    op.drop_index("ix_holdings_asset_id", "holdings")
    op.drop_index("ix_holdings_as_of_date", "holdings")
    op.drop_index("ix_transactions_org_id", "transactions")
    op.drop_index("ix_transactions_portfolio_id", "transactions")
    op.drop_index("ix_transactions_trade_date", "transactions")
    op.drop_index("ix_transactions_external_id", "transactions")
    op.drop_index("ix_asset_prices_asset_id_date", "asset_prices")
    op.drop_index("ix_memberships_org_id", "memberships")
    op.drop_index("ix_memberships_user_id", "memberships")
    op.drop_index("ix_ai_conversations_org_id_user_id", "ai_conversations")
    op.drop_index("ix_ai_messages_conversation_id", "ai_messages")
    op.drop_index("ix_audit_logs_org_id", "audit_logs")
    op.drop_index("ix_audit_logs_user_id", "audit_logs")
    op.drop_index("ix_audit_logs_created_at", "audit_logs")
    op.drop_index("ix_portfolios_org_deleted", "portfolios")
    op.drop_index("ix_holdings_org_deleted", "holdings")
    op.drop_index("ix_transactions_org_deleted", "transactions")
