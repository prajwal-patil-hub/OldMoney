export interface Portfolio {
  id: string
  org_id: string
  name: string
  description?: string
  currency: string
  inception_date?: string
  benchmark?: string
  tags: string[]
  created_at: string
  updated_at: string
  // Computed fields
  total_value?: number
  total_cost?: number
  unrealized_gain?: number
  unrealized_gain_pct?: number
  ytd_return?: number
  ytd_return_pct?: number
  day_change?: number
  day_change_pct?: number
}

export interface PortfolioPerformance {
  portfolio_id: string
  date: string
  nav: number
  daily_return: number
  cumulative_return: number
  benchmark_return?: number
}

export interface Holding {
  id: string
  portfolio_id: string
  asset_id: string
  asset_name: string
  asset_symbol: string
  asset_type: AssetType
  quantity: number
  avg_cost: number
  cost_basis: number
  current_price: number
  current_value: number
  unrealized_gain: number
  unrealized_gain_pct: number
  weight: number
  updated_at: string
}

export type AssetType =
  | 'equity'
  | 'fixed_income'
  | 'real_estate'
  | 'private_equity'
  | 'hedge_fund'
  | 'cash'
  | 'crypto'
  | 'commodity'
  | 'alternative'

export interface AllocationBreakdown {
  asset_type: AssetType
  value: number
  weight: number
  count: number
}

export interface CreatePortfolioInput {
  name: string
  description?: string
  currency: string
  inception_date?: string
  benchmark?: string
  tags?: string[]
}

export interface UpdatePortfolioInput extends Partial<CreatePortfolioInput> {
  id: string
}
