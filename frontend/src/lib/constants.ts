import type { AssetType } from '@/types/portfolio'
import type { TransactionType } from '@/types/transaction'

export const APP_NAME = 'OldMoney'
export const APP_TAGLINE = 'Wealth Intelligence, Refined'

// Empty string: all API calls go to /api/v1/... which Next.js proxies to
// http://localhost:8000/api/v1/... — the browser never makes a cross-origin request.
// Do NOT set this to an absolute URL; keep it empty so the Next.js rewrite handles routing.
export const API_BASE_URL = ''

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  EQUITY: 'Equity',
  ETF: 'ETF',
  MUTUAL_FUND: 'Mutual Fund',
  BOND: 'Bond',
  CRYPTO: 'Crypto',
  PE_VC: 'Private Equity / VC',
  REAL_ESTATE: 'Real Estate',
  DERIVATIVE: 'Derivative',
  CASH: 'Cash',
  ALTERNATIVE: 'Alternative',
}

export const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  EQUITY: '#7C2220',
  ETF: '#854023',
  MUTUAL_FUND: '#9F6920',
  BOND: '#DAA755',
  CRYPTO: '#6C5141',
  PE_VC: '#2D6A4F',
  REAL_ESTATE: '#A28C75',
  DERIVATIVE: '#1B4965',
  CASH: '#3D5A6A',
  ALTERNATIVE: '#3D2820',
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  BUY: 'Buy',
  SELL: 'Sell',
  DIVIDEND: 'Dividend',
  INTEREST: 'Interest',
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
  TRANSFER_IN: 'Transfer In',
  TRANSFER_OUT: 'Transfer Out',
  FEE: 'Fee',
  TAX: 'Tax',
  SPLIT: 'Split',
  MERGER: 'Merger',
}

export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  BUY: 'bg-success-bg text-success',
  SELL: 'bg-danger-bg text-danger',
  DIVIDEND: 'bg-info-bg text-info',
  INTEREST: 'bg-info-bg text-info',
  DEPOSIT: 'bg-success-bg text-success',
  WITHDRAWAL: 'bg-danger-bg text-danger',
  TRANSFER_IN: 'bg-warning-bg text-warning',
  TRANSFER_OUT: 'bg-warning-bg text-warning',
  FEE: 'bg-surface-muted text-text-muted',
  TAX: 'bg-surface-muted text-text-muted',
  SPLIT: 'bg-info-bg text-info',
  MERGER: 'bg-info-bg text-info',
}

export const CURRENCIES = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'JPY', label: 'Japanese Yen (JPY)' },
  { value: 'CHF', label: 'Swiss Franc (CHF)' },
  { value: 'CAD', label: 'Canadian Dollar (CAD)' },
  { value: 'AUD', label: 'Australian Dollar (AUD)' },
  { value: 'SGD', label: 'Singapore Dollar (SGD)' },
  { value: 'HKD', label: 'Hong Kong Dollar (HKD)' },
]

export const BENCHMARKS = [
  { value: 'SPX', label: 'S&P 500 (SPX)' },
  { value: 'MSCI_WORLD', label: 'MSCI World' },
  { value: 'MSCI_ACWI', label: 'MSCI ACWI' },
  { value: 'FTSE_100', label: 'FTSE 100' },
  { value: 'NASDAQ', label: 'NASDAQ Composite' },
  { value: 'AGG', label: 'US Aggregate Bond (AGG)' },
  { value: 'CUSTOM', label: 'Custom Benchmark' },
]

export const IMPORT_COLUMN_MAPPINGS = [
  { field: 'trade_date', label: 'Trade Date', required: true },
  { field: 'asset_symbol', label: 'Asset Symbol', required: true },
  { field: 'transaction_type', label: 'Transaction Type', required: true },
  { field: 'quantity', label: 'Quantity', required: true },
  { field: 'price', label: 'Price', required: true },
  { field: 'commission', label: 'Commission', required: false },
  { field: 'tax', label: 'Tax', required: false },
  { field: 'currency', label: 'Currency', required: false },
  { field: 'account', label: 'Account', required: false },
  { field: 'notes', label: 'Notes', required: false },
  { field: 'external_id', label: 'External ID', required: false },
]

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/portfolios', label: 'Portfolios', icon: 'Briefcase' },
  { href: '/assets', label: 'Assets', icon: 'TrendingUp' },
  { href: '/transactions', label: 'Transactions', icon: 'ArrowLeftRight' },
  { href: '/imports', label: 'Import', icon: 'Upload' },
  { href: '/ai', label: 'AI Copilot', icon: 'Sparkles' },
  { href: '/settings', label: 'Settings', icon: 'Settings2' },
] as const

export const STALE_TIME = {
  SHORT: 30_000,        // 30s
  MEDIUM: 5 * 60_000,  // 5min
  LONG: 30 * 60_000,   // 30min
} as const
