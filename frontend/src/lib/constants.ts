import type { AssetType } from '@/types/portfolio'
import type { TransactionType } from '@/types/transaction'

export const APP_NAME = 'OldMoney'
export const APP_TAGLINE = 'Wealth Intelligence, Refined'

// Empty string: all API calls go to /api/v1/... which Next.js proxies to
// http://localhost:8000/api/v1/... — the browser never makes a cross-origin request.
// Do NOT set this to an absolute URL; keep it empty so the Next.js rewrite handles routing.
export const API_BASE_URL = ''

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  equity: 'Equity',
  fixed_income: 'Fixed Income',
  real_estate: 'Real Estate',
  private_equity: 'Private Equity',
  hedge_fund: 'Hedge Fund',
  cash: 'Cash',
  crypto: 'Crypto',
  commodity: 'Commodity',
  alternative: 'Alternative',
}

export const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  equity: '#7C2220',
  fixed_income: '#854023',
  real_estate: '#9F6920',
  private_equity: '#DAA755',
  hedge_fund: '#2D6A4F',
  cash: '#1B4965',
  crypto: '#6C5141',
  commodity: '#A28C75',
  alternative: '#3D2820',
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  buy: 'Buy',
  sell: 'Sell',
  dividend: 'Dividend',
  interest: 'Interest',
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  fee: 'Fee',
  tax: 'Tax',
  split: 'Split',
  merger: 'Merger',
}

export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  buy: 'bg-success-bg text-success',
  sell: 'bg-danger-bg text-danger',
  dividend: 'bg-info-bg text-info',
  interest: 'bg-info-bg text-info',
  deposit: 'bg-success-bg text-success',
  withdrawal: 'bg-danger-bg text-danger',
  transfer_in: 'bg-warning-bg text-warning',
  transfer_out: 'bg-warning-bg text-warning',
  fee: 'bg-surface-muted text-text-muted',
  tax: 'bg-surface-muted text-text-muted',
  split: 'bg-info-bg text-info',
  merger: 'bg-info-bg text-info',
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
